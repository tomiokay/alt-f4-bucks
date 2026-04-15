-- =============================================================
-- Alt-F4 Bucks — Score Prediction Migration
-- Run AFTER migration_prediction_markets.sql
-- Adds accuracy-based score prediction:
--   Users predict total match score, closer = bigger payout
-- =============================================================

-- 1. Add score_prediction and ranking_position to allowed types
alter table public.prediction_markets
  drop constraint if exists prediction_markets_type_check;

alter table public.prediction_markets
  add constraint prediction_markets_type_check
  check (type in (
    'score_over_under',
    'score_prediction',
    'event_winner',
    'ranking_top1',
    'ranking_top8',
    'ranking_position'
  ));

-- Fix duplicate event-level markets bug:
-- NULL != NULL in SQL so the unique constraint didn't work for event-level markets
-- Replace with a unique index using COALESCE
alter table public.prediction_markets
  drop constraint if exists uq_prediction_market;

create unique index if not exists uq_prediction_market_idx
  on public.prediction_markets (event_key, coalesce(match_key, ''), type);

-- Delete duplicate event-level markets (keep the oldest one)
delete from public.prediction_markets a
using public.prediction_markets b
where a.id > b.id
  and a.event_key = b.event_key
  and a.type = b.type
  and a.match_key is null
  and b.match_key is null;

-- 2. Add predicted_value column to prediction_bets
-- For score predictions, this stores the user's predicted total score
alter table public.prediction_bets
  add column if not exists predicted_value numeric;

-- 3. Add actual_value column to prediction_markets
-- For score predictions, stores the actual total score when resolved
alter table public.prediction_markets
  add column if not exists actual_value numeric;

-- =============================================================
-- 4. RPC — Place score prediction bet
-- =============================================================
create or replace function public.place_score_prediction(
  p_user_id       uuid,
  p_market_id     uuid,
  p_predicted_score numeric,
  p_amount        integer
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_market  public.prediction_markets%rowtype;
  v_balance int;
  v_bet_id  uuid;
begin
  if p_amount < 1 then
    raise exception 'Bet must be at least 1 Buck';
  end if;

  if p_predicted_score < 0 then
    raise exception 'Predicted score must be positive';
  end if;

  -- Lock and check market
  select * into v_market
  from public.prediction_markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.status != 'open' then
    raise exception 'Market is closed';
  end if;

  if v_market.type != 'score_prediction' then
    raise exception 'Not a score prediction market';
  end if;

  -- Lock and check balance
  select coalesce(sum(amount), 0) into v_balance
  from public.transactions
  where to_user_id = p_user_id
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient balance. You have % but need %', v_balance, p_amount;
  end if;

  -- Create the bet with predicted value
  insert into public.prediction_bets (user_id, market_id, option_key, amount, predicted_value)
  values (p_user_id, p_market_id, 'score', p_amount, p_predicted_score)
  returning id into v_bet_id;

  -- Escrow
  insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
  values (
    'adjustment',
    -p_amount,
    p_user_id,
    p_user_id,
    'Score prediction — ' || v_market.title,
    'prediction_escrow',
    jsonb_build_object('prediction_bet_id', v_bet_id, 'market_id', p_market_id, 'predicted_score', p_predicted_score)
  );

  return v_bet_id;
end;
$$;

-- =============================================================
-- 5. RPC — Resolve score prediction (accuracy-weighted payout)
-- Payout formula: weight = 1 / (1 + |predicted - actual|)^2
-- Each bettor's share = (bet * weight) / sum(all bets * weights) * total_pool
-- =============================================================
create or replace function public.resolve_score_prediction(
  p_market_id   uuid,
  p_actual_score numeric
)
returns int
language plpgsql
security definer
as $$
declare
  v_market        public.prediction_markets%rowtype;
  v_total_pool    int;
  v_total_weighted numeric := 0;
  v_bet           record;
  v_weight        numeric;
  v_payout        int;
  v_resolved      int := 0;
  v_payout_sum    int := 0;
  v_remainder     int;
  v_largest_bet_id uuid;
  v_largest_weighted numeric := 0;
begin
  select * into v_market
  from public.prediction_markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.status = 'resolved' then
    return 0;
  end if;

  -- Get total pool
  select coalesce(sum(amount), 0) into v_total_pool
  from public.prediction_bets
  where market_id = p_market_id and payout is null;

  if v_total_pool = 0 then
    update public.prediction_markets
    set status = 'resolved', actual_value = p_actual_score, resolved_at = now()
    where id = p_market_id;
    return 0;
  end if;

  -- First pass: calculate total weighted amount
  for v_bet in
    select * from public.prediction_bets
    where market_id = p_market_id and payout is null
  loop
    -- weight = 1 / (1 + |error|)^2
    -- Exact prediction: weight = 1.0
    -- Off by 1: weight = 0.25
    -- Off by 5: weight = 0.028
    -- Off by 10: weight = 0.008
    v_weight := 1.0 / power(1 + abs(v_bet.predicted_value - p_actual_score), 2);
    v_total_weighted := v_total_weighted + (v_bet.amount * v_weight);
  end loop;

  -- Edge case: if total weighted is essentially zero, refund everyone
  if v_total_weighted < 0.001 then
    for v_bet in
      select * from public.prediction_bets
      where market_id = p_market_id and payout is null
    loop
      update public.prediction_bets set payout = v_bet.amount where id = v_bet.id;
      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values (
        'adjustment', v_bet.amount, v_bet.user_id, v_bet.user_id,
        'Score prediction refund — ' || v_market.title, 'prediction_refund',
        jsonb_build_object('prediction_bet_id', v_bet.id, 'market_id', p_market_id)
      );
      v_resolved := v_resolved + 1;
    end loop;

    update public.prediction_markets
    set status = 'resolved', actual_value = p_actual_score, resolved_at = now()
    where id = p_market_id;
    return v_resolved;
  end if;

  -- Second pass: distribute payouts proportionally to weighted amounts
  v_largest_bet_id := null;

  for v_bet in
    select * from public.prediction_bets
    where market_id = p_market_id and payout is null
    order by amount desc
  loop
    v_weight := 1.0 / power(1 + abs(v_bet.predicted_value - p_actual_score), 2);
    v_payout := floor((v_bet.amount * v_weight) / v_total_weighted * v_total_pool);
    v_payout_sum := v_payout_sum + v_payout;

    if (v_bet.amount * v_weight) > v_largest_weighted then
      v_largest_weighted := v_bet.amount * v_weight;
      v_largest_bet_id := v_bet.id;
    end if;

    update public.prediction_bets set payout = v_payout where id = v_bet.id;

    if v_payout > 0 then
      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values (
        'adjustment', v_payout, v_bet.user_id, v_bet.user_id,
        'Score prediction won — ' || v_market.title, 'prediction_won',
        jsonb_build_object(
          'prediction_bet_id', v_bet.id,
          'market_id', p_market_id,
          'predicted', v_bet.predicted_value,
          'actual', p_actual_score,
          'error', abs(v_bet.predicted_value - p_actual_score)
        )
      );
    end if;

    v_resolved := v_resolved + 1;
  end loop;

  -- Remainder to highest-weighted bettor
  v_remainder := v_total_pool - v_payout_sum;
  if v_remainder > 0 and v_largest_bet_id is not null then
    update public.prediction_bets
    set payout = payout + v_remainder
    where id = v_largest_bet_id;

    insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
    values (
      'adjustment', v_remainder,
      (select user_id from public.prediction_bets where id = v_largest_bet_id),
      (select user_id from public.prediction_bets where id = v_largest_bet_id),
      'Rounding adjustment — ' || v_market.title, 'prediction_won',
      jsonb_build_object('prediction_bet_id', v_largest_bet_id, 'type', 'remainder')
    );
  end if;

  update public.prediction_markets
  set status = 'resolved', actual_value = p_actual_score, resolved_at = now()
  where id = p_market_id;

  return v_resolved;
end;
$$;
