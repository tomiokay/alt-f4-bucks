-- =============================================================
-- Alt-F4 Bucks — ALL Prediction Market Migrations (Consolidated)
-- Safe to run even if parts have already been applied.
-- Paste this entire file into Supabase SQL Editor and run it.
-- =============================================================

-- =============================================================
-- 1. TABLES
-- =============================================================

-- Prediction markets table
create table if not exists public.prediction_markets (
  id            uuid primary key default gen_random_uuid(),
  event_key     text not null,
  match_key     text references public.match_cache(match_key),
  type          text not null,
  title         text not null,
  description   text,
  options       jsonb not null default '[]'::jsonb,
  line          numeric,
  correct_option text,
  status        text not null default 'open',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

-- Add columns that may be missing
alter table public.prediction_markets
  add column if not exists actual_value numeric;

-- Prediction bets table
create table if not exists public.prediction_bets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  market_id     uuid not null references public.prediction_markets(id),
  option_key    text not null,
  amount        integer not null check (amount > 0),
  payout        integer,
  created_at    timestamptz not null default now()
);

-- Add columns that may be missing
alter table public.prediction_bets
  add column if not exists predicted_value numeric;

-- =============================================================
-- 2. CONSTRAINTS — drop old, add current
-- =============================================================

-- Update type check to include all market types
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

-- Update status check
alter table public.prediction_markets
  drop constraint if exists prediction_markets_status_check;

alter table public.prediction_markets
  add constraint prediction_markets_status_check
  check (status in ('open', 'closed', 'resolved', 'voided'));

-- =============================================================
-- 3. FIX DUPLICATES + UNIQUE INDEX
-- =============================================================

-- Drop old broken unique constraint (NULL != NULL made it useless)
alter table public.prediction_markets
  drop constraint if exists uq_prediction_market;

-- Delete duplicate event-level markets (keep oldest by id)
delete from public.prediction_markets a
using public.prediction_markets b
where a.id > b.id
  and a.event_key = b.event_key
  and a.type = b.type
  and a.match_key is null
  and b.match_key is null;

-- Delete duplicate match-level markets
delete from public.prediction_markets a
using public.prediction_markets b
where a.id > b.id
  and a.event_key = b.event_key
  and a.type = b.type
  and a.match_key is not null
  and a.match_key = b.match_key;

-- Create proper unique index using COALESCE for NULLs
drop index if exists uq_prediction_market_idx;
create unique index uq_prediction_market_idx
  on public.prediction_markets (event_key, coalesce(match_key, ''), type);

-- =============================================================
-- 4. INDEXES
-- =============================================================
create index if not exists idx_pred_markets_event  on public.prediction_markets(event_key);
create index if not exists idx_pred_markets_match  on public.prediction_markets(match_key);
create index if not exists idx_pred_markets_status on public.prediction_markets(status);
create index if not exists idx_pred_bets_user      on public.prediction_bets(user_id);
create index if not exists idx_pred_bets_market    on public.prediction_bets(market_id);

-- =============================================================
-- 5. VIEW — Pool summary per prediction market option
-- =============================================================
create or replace view public.prediction_pool_summary as
select
  market_id,
  option_key,
  coalesce(sum(amount), 0)::int as pool,
  count(*)::int as bettors
from public.prediction_bets
where payout is null
group by market_id, option_key;

-- =============================================================
-- 6. RPC — Place prediction bet (multi-option markets)
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

  select exists(
    select 1 from jsonb_array_elements(v_market.options) opt
    where opt->>'key' = p_option
  ) into v_valid;

  if not v_valid then
    raise exception 'Invalid option';
  end if;

  -- Lock rows first, then aggregate (avoids FOR UPDATE + aggregate error)
  perform 1 from public.transactions
  where to_user_id = p_user_id
  for update;

  select coalesce(sum(amount), 0) into v_balance
  from public.transactions
  where to_user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'Insufficient balance. You have % but need %', v_balance, p_amount;
  end if;

  insert into public.prediction_bets (user_id, market_id, option_key, amount)
  values (p_user_id, p_market_id, p_option, p_amount)
  returning id into v_bet_id;

  insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
  values (
    'adjustment', -p_amount, p_user_id, p_user_id,
    'Prediction bet — ' || v_market.title, 'prediction_escrow',
    jsonb_build_object('prediction_bet_id', v_bet_id, 'market_id', p_market_id, 'option', p_option)
  );

  return v_bet_id;
end;
$$;

-- =============================================================
-- 7. RPC — Resolve prediction market (option-based, parimutuel)
-- =============================================================
create or replace function public.resolve_prediction_market(
  p_market_id     uuid,
  p_correct_option text
)
returns int
language plpgsql
security definer
as $$
declare
  v_market        public.prediction_markets%rowtype;
  v_total_pool    int;
  v_winning_pool  int;
  v_bet           record;
  v_payout        int;
  v_resolved      int := 0;
  v_payout_sum    int := 0;
  v_remainder     int;
  v_largest_bet_id uuid;
begin
  select * into v_market from public.prediction_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status = 'resolved' then return 0; end if;

  select coalesce(sum(amount), 0) into v_total_pool
  from public.prediction_bets where market_id = p_market_id and payout is null;

  if v_total_pool = 0 then
    update public.prediction_markets set status = 'resolved', correct_option = p_correct_option, resolved_at = now() where id = p_market_id;
    return 0;
  end if;

  select coalesce(sum(amount), 0) into v_winning_pool
  from public.prediction_bets where market_id = p_market_id and option_key = p_correct_option and payout is null;

  if v_winning_pool = 0 then
    for v_bet in select * from public.prediction_bets where market_id = p_market_id and payout is null loop
      update public.prediction_bets set payout = v_bet.amount where id = v_bet.id;
      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values ('adjustment', v_bet.amount, v_bet.user_id, v_bet.user_id,
        'Prediction refund — ' || v_market.title, 'prediction_refund',
        jsonb_build_object('prediction_bet_id', v_bet.id, 'market_id', p_market_id));
      v_resolved := v_resolved + 1;
    end loop;
    update public.prediction_markets set status = 'resolved', correct_option = p_correct_option, resolved_at = now() where id = p_market_id;
    return v_resolved;
  end if;

  v_largest_bet_id := null;
  for v_bet in select * from public.prediction_bets where market_id = p_market_id and payout is null order by amount desc loop
    if v_bet.option_key = p_correct_option then
      v_payout := floor(v_bet.amount::numeric * v_total_pool / v_winning_pool);
      v_payout_sum := v_payout_sum + v_payout;
      if v_largest_bet_id is null then v_largest_bet_id := v_bet.id; end if;
      update public.prediction_bets set payout = v_payout where id = v_bet.id;
      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values ('adjustment', v_payout, v_bet.user_id, v_bet.user_id,
        'Prediction won — ' || v_market.title, 'prediction_won',
        jsonb_build_object('prediction_bet_id', v_bet.id, 'market_id', p_market_id));
    else
      update public.prediction_bets set payout = 0 where id = v_bet.id;
    end if;
    v_resolved := v_resolved + 1;
  end loop;

  v_remainder := v_total_pool - v_payout_sum;
  if v_remainder > 0 and v_largest_bet_id is not null then
    update public.prediction_bets set payout = payout + v_remainder where id = v_largest_bet_id;
    insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
    values ('adjustment', v_remainder,
      (select user_id from public.prediction_bets where id = v_largest_bet_id),
      (select user_id from public.prediction_bets where id = v_largest_bet_id),
      'Rounding adjustment — ' || v_market.title, 'prediction_won',
      jsonb_build_object('prediction_bet_id', v_largest_bet_id, 'type', 'remainder'));
  end if;

  update public.prediction_markets set status = 'resolved', correct_option = p_correct_option, resolved_at = now() where id = p_market_id;
  return v_resolved;
end;
$$;

-- =============================================================
-- 8. RPC — Place score prediction (accuracy-based)
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
  if p_amount < 1 then raise exception 'Bet must be at least 1 Buck'; end if;
  if p_predicted_score < 0 then raise exception 'Predicted score must be positive'; end if;

  select * into v_market from public.prediction_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status != 'open' then raise exception 'Market is closed'; end if;
  if v_market.type != 'score_prediction' then raise exception 'Not a score prediction market'; end if;

  perform 1 from public.transactions where to_user_id = p_user_id for update;
  select coalesce(sum(amount), 0) into v_balance from public.transactions where to_user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'Insufficient balance. You have % but need %', v_balance, p_amount;
  end if;

  insert into public.prediction_bets (user_id, market_id, option_key, amount, predicted_value)
  values (p_user_id, p_market_id, 'score', p_amount, p_predicted_score)
  returning id into v_bet_id;

  insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
  values ('adjustment', -p_amount, p_user_id, p_user_id,
    'Score prediction — ' || v_market.title, 'prediction_escrow',
    jsonb_build_object('prediction_bet_id', v_bet_id, 'market_id', p_market_id, 'predicted_score', p_predicted_score));

  return v_bet_id;
end;
$$;

-- =============================================================
-- 9. RPC — Resolve score prediction (accuracy-weighted payout)
-- weight = 1 / (1 + |predicted - actual|)^2
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
  select * into v_market from public.prediction_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status = 'resolved' then return 0; end if;

  select coalesce(sum(amount), 0) into v_total_pool
  from public.prediction_bets where market_id = p_market_id and payout is null;

  if v_total_pool = 0 then
    update public.prediction_markets set status = 'resolved', actual_value = p_actual_score, resolved_at = now() where id = p_market_id;
    return 0;
  end if;

  -- First pass: calculate total weighted amount
  for v_bet in select * from public.prediction_bets where market_id = p_market_id and payout is null loop
    v_weight := 1.0 / power(1 + abs(v_bet.predicted_value - p_actual_score), 2);
    v_total_weighted := v_total_weighted + (v_bet.amount * v_weight);
  end loop;

  if v_total_weighted < 0.001 then
    for v_bet in select * from public.prediction_bets where market_id = p_market_id and payout is null loop
      update public.prediction_bets set payout = v_bet.amount where id = v_bet.id;
      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values ('adjustment', v_bet.amount, v_bet.user_id, v_bet.user_id,
        'Score prediction refund — ' || v_market.title, 'prediction_refund',
        jsonb_build_object('prediction_bet_id', v_bet.id, 'market_id', p_market_id));
      v_resolved := v_resolved + 1;
    end loop;
    update public.prediction_markets set status = 'resolved', actual_value = p_actual_score, resolved_at = now() where id = p_market_id;
    return v_resolved;
  end if;

  -- Second pass: distribute payouts
  v_largest_bet_id := null;
  for v_bet in select * from public.prediction_bets where market_id = p_market_id and payout is null order by amount desc loop
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
      values ('adjustment', v_payout, v_bet.user_id, v_bet.user_id,
        'Score prediction won — ' || v_market.title, 'prediction_won',
        jsonb_build_object('prediction_bet_id', v_bet.id, 'market_id', p_market_id,
          'predicted', v_bet.predicted_value, 'actual', p_actual_score,
          'error', abs(v_bet.predicted_value - p_actual_score)));
    end if;
    v_resolved := v_resolved + 1;
  end loop;

  v_remainder := v_total_pool - v_payout_sum;
  if v_remainder > 0 and v_largest_bet_id is not null then
    update public.prediction_bets set payout = payout + v_remainder where id = v_largest_bet_id;
    insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
    values ('adjustment', v_remainder,
      (select user_id from public.prediction_bets where id = v_largest_bet_id),
      (select user_id from public.prediction_bets where id = v_largest_bet_id),
      'Rounding adjustment — ' || v_market.title, 'prediction_won',
      jsonb_build_object('prediction_bet_id', v_largest_bet_id, 'type', 'remainder'));
  end if;

  update public.prediction_markets set status = 'resolved', actual_value = p_actual_score, resolved_at = now() where id = p_market_id;
  return v_resolved;
end;
$$;

-- =============================================================
-- 10. RLS POLICIES
-- =============================================================
alter table public.prediction_markets enable row level security;
alter table public.prediction_bets enable row level security;

-- Drop existing policies to avoid conflicts, then recreate
drop policy if exists "Authenticated users can view prediction markets" on public.prediction_markets;
drop policy if exists "Service role manages prediction markets" on public.prediction_markets;
drop policy if exists "Authenticated users can view prediction bets" on public.prediction_bets;
drop policy if exists "Users can place prediction bets" on public.prediction_bets;

create policy "Authenticated users can view prediction markets"
  on public.prediction_markets for select to authenticated using (true);

create policy "Service role manages prediction markets"
  on public.prediction_markets for all to service_role using (true) with check (true);

create policy "Authenticated users can view prediction bets"
  on public.prediction_bets for select to authenticated using (true);

create policy "Users can place prediction bets"
  on public.prediction_bets for insert to authenticated with check (user_id = auth.uid());

grant select on public.prediction_pool_summary to authenticated;

-- =============================================================
-- 11. LEADERBOARD VIEW — include team_number
-- =============================================================
drop view if exists public.leaderboard_view;

create view public.leaderboard_view as
select
  p.id          as user_id,
  p.display_name,
  p.team_number,
  coalesce(sum(t.amount), 0)::int as balance
from public.profiles p
left join public.transactions t on t.to_user_id = p.id
group by p.id, p.display_name, p.team_number
order by balance desc;

grant select on public.leaderboard_view to anon;
grant select on public.leaderboard_view to authenticated;
