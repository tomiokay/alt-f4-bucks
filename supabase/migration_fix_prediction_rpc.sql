-- Fix "FOR UPDATE is not allowed with aggregate functions" error
-- in place_prediction_bet and place_score_prediction RPCs.
-- Separates row locking from the aggregate balance query.

-- =============================================================
-- 1. Fix place_prediction_bet
-- =============================================================
create or replace function public.place_prediction_bet(
  p_user_id   uuid,
  p_market_id uuid,
  p_option    text,
  p_amount    integer
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_market  public.prediction_markets%rowtype;
  v_balance int;
  v_bet_id  uuid;
  v_valid   boolean;
begin
  if p_amount < 1 then
    raise exception 'Bet must be at least 1 Buck';
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

  -- Validate option_key exists in market options
  select exists(
    select 1 from jsonb_array_elements(v_market.options) opt
    where opt->>'key' = p_option
  ) into v_valid;

  if not v_valid then
    raise exception 'Invalid option';
  end if;

  -- Lock user's transaction rows, then compute balance separately
  perform 1 from public.transactions
  where to_user_id = p_user_id
  for update;

  select coalesce(sum(amount), 0) into v_balance
  from public.transactions
  where to_user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'Insufficient balance. You have % but need %', v_balance, p_amount;
  end if;

  -- Create the bet
  insert into public.prediction_bets (user_id, market_id, option_key, amount)
  values (p_user_id, p_market_id, p_option, p_amount)
  returning id into v_bet_id;

  -- Escrow: debit
  insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
  values (
    'adjustment',
    -p_amount,
    p_user_id,
    p_user_id,
    'Prediction bet — ' || v_market.title,
    'prediction_escrow',
    jsonb_build_object('prediction_bet_id', v_bet_id, 'market_id', p_market_id, 'option', p_option)
  );

  return v_bet_id;
end;
$$;

-- =============================================================
-- 2. Fix place_score_prediction
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

  -- Lock user's transaction rows, then compute balance separately
  perform 1 from public.transactions
  where to_user_id = p_user_id
  for update;

  select coalesce(sum(amount), 0) into v_balance
  from public.transactions
  where to_user_id = p_user_id;

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
