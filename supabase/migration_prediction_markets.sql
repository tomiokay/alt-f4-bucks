-- =============================================================
-- Alt-F4 Bucks — Prediction Markets Migration
-- Run in Supabase SQL Editor
-- Adds multi-option prediction markets:
--   - Score over/under per match
--   - Event winner (which alliance wins)
--   - Ranking prediction (which team finishes #1)
-- =============================================================

-- =============================================================
-- 1. PREDICTION MARKETS TABLE
-- =============================================================
create table public.prediction_markets (
  id            uuid primary key default gen_random_uuid(),
  event_key     text not null,
  match_key     text references public.match_cache(match_key),  -- null for event-level markets
  type          text not null check (type in (
    'score_over_under',    -- over/under on total match score
    'event_winner',        -- which alliance wins the event
    'ranking_top1',        -- which team finishes #1 in quals
    'ranking_top8'         -- will team X finish top 8
  )),
  title         text not null,
  description   text,
  options       jsonb not null default '[]'::jsonb,  -- [{key, label}]
  line          numeric,           -- for over/under: the predicted total score
  correct_option text,             -- set when resolved
  status        text not null default 'open' check (status in ('open', 'closed', 'resolved', 'voided')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,

  -- Prevent duplicate markets
  constraint uq_prediction_market unique (event_key, match_key, type)
);

-- =============================================================
-- 2. PREDICTION BETS TABLE
-- =============================================================
create table public.prediction_bets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  market_id     uuid not null references public.prediction_markets(id),
  option_key    text not null,
  amount        integer not null check (amount > 0),
  payout        integer,  -- null until resolved
  created_at    timestamptz not null default now()
);

-- =============================================================
-- 3. INDEXES
-- =============================================================
create index idx_pred_markets_event    on public.prediction_markets(event_key);
create index idx_pred_markets_match    on public.prediction_markets(match_key);
create index idx_pred_markets_status   on public.prediction_markets(status);
create index idx_pred_bets_user        on public.prediction_bets(user_id);
create index idx_pred_bets_market      on public.prediction_bets(market_id);

-- =============================================================
-- 4. VIEW — Pool summary per prediction market option
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
-- 5. RPC — Place prediction bet (atomic)
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

  -- Lock and check balance
  select coalesce(sum(amount), 0) into v_balance
  from public.transactions
  where to_user_id = p_user_id
  for update;

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
-- 6. RPC — Resolve prediction market (payout winners)
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
    set status = 'resolved', correct_option = p_correct_option, resolved_at = now()
    where id = p_market_id;
    return 0;
  end if;

  -- Get winning pool
  select coalesce(sum(amount), 0) into v_winning_pool
  from public.prediction_bets
  where market_id = p_market_id and option_key = p_correct_option and payout is null;

  -- No winners: refund everyone
  if v_winning_pool = 0 then
    for v_bet in
      select * from public.prediction_bets
      where market_id = p_market_id and payout is null
    loop
      update public.prediction_bets set payout = v_bet.amount where id = v_bet.id;
      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values (
        'adjustment', v_bet.amount, v_bet.user_id, v_bet.user_id,
        'Prediction refund — ' || v_market.title, 'prediction_refund',
        jsonb_build_object('prediction_bet_id', v_bet.id, 'market_id', p_market_id)
      );
      v_resolved := v_resolved + 1;
    end loop;

    update public.prediction_markets
    set status = 'resolved', correct_option = p_correct_option, resolved_at = now()
    where id = p_market_id;
    return v_resolved;
  end if;

  -- Payout winners proportionally
  v_largest_bet_id := null;

  for v_bet in
    select * from public.prediction_bets
    where market_id = p_market_id and payout is null
    order by amount desc
  loop
    if v_bet.option_key = p_correct_option then
      v_payout := floor(v_bet.amount::numeric * v_total_pool / v_winning_pool);
      v_payout_sum := v_payout_sum + v_payout;

      if v_largest_bet_id is null then
        v_largest_bet_id := v_bet.id;
      end if;

      update public.prediction_bets set payout = v_payout where id = v_bet.id;
      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values (
        'adjustment', v_payout, v_bet.user_id, v_bet.user_id,
        'Prediction won — ' || v_market.title, 'prediction_won',
        jsonb_build_object('prediction_bet_id', v_bet.id, 'market_id', p_market_id)
      );
    else
      update public.prediction_bets set payout = 0 where id = v_bet.id;
    end if;
    v_resolved := v_resolved + 1;
  end loop;

  -- Remainder to largest winner
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
  set status = 'resolved', correct_option = p_correct_option, resolved_at = now()
  where id = p_market_id;

  return v_resolved;
end;
$$;

-- =============================================================
-- 7. RLS POLICIES
-- =============================================================
alter table public.prediction_markets enable row level security;
alter table public.prediction_bets enable row level security;

-- Markets: viewable by all authenticated
create policy "Authenticated users can view prediction markets"
  on public.prediction_markets for select
  to authenticated
  using (true);

-- Markets: only service role creates/updates (via sync)
create policy "Service role manages prediction markets"
  on public.prediction_markets for all
  to service_role
  using (true)
  with check (true);

-- Bets: viewable by all authenticated
create policy "Authenticated users can view prediction bets"
  on public.prediction_bets for select
  to authenticated
  using (true);

-- Bets: users can place their own
create policy "Users can place prediction bets"
  on public.prediction_bets for insert
  to authenticated
  with check (user_id = auth.uid());

-- Grant view access
grant select on public.prediction_pool_summary to authenticated;
