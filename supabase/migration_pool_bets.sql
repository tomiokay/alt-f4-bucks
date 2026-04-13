-- =============================================================
-- Alt-F4 Bucks — Pool Betting Migration (Polymarket-style)
-- Run AFTER migration_bets.sql in Supabase SQL Editor
-- Replaces peer-to-peer betting with pool/parimutuel betting
-- =============================================================

-- =============================================================
-- 1. POOL BETS TABLE
-- =============================================================
create table public.pool_bets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id),
  match_key   text not null references public.match_cache(match_key),
  side        text not null check (side in ('red', 'blue')),
  amount      integer not null check (amount > 0),
  payout      integer,  -- null until resolved
  created_at  timestamptz not null default now()
);

-- =============================================================
-- 2. INDEXES
-- =============================================================
create index idx_pool_bets_user      on public.pool_bets(user_id);
create index idx_pool_bets_match     on public.pool_bets(match_key);
create index idx_pool_bets_side      on public.pool_bets(match_key, side);

-- =============================================================
-- 3. VIEW — Pool summary per match (live odds)
-- =============================================================
create or replace view public.match_pool_summary as
select
  match_key,
  coalesce(sum(amount) filter (where side = 'red'), 0)::int as red_pool,
  coalesce(sum(amount) filter (where side = 'blue'), 0)::int as blue_pool,
  (coalesce(sum(amount) filter (where side = 'red'), 0) +
   coalesce(sum(amount) filter (where side = 'blue'), 0))::int as total_pool,
  count(*) filter (where side = 'red')::int as red_bettors,
  count(*) filter (where side = 'blue')::int as blue_bettors,
  count(*)::int as total_bettors
from public.pool_bets
where payout is null  -- only unresolved bets
group by match_key;

-- =============================================================
-- 4. RPC — Place pool bet (atomic escrow)
-- =============================================================
create or replace function public.place_pool_bet(
  p_user_id   uuid,
  p_match_key text,
  p_side      text,
  p_amount    integer
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_match   public.match_cache%rowtype;
  v_balance int;
  v_bet_id  uuid;
begin
  -- Validate side
  if p_side not in ('red', 'blue') then
    raise exception 'Side must be red or blue';
  end if;

  if p_amount < 1 then
    raise exception 'Bet must be at least 1 Buck';
  end if;

  -- Check match exists and is bettable
  select * into v_match
  from public.match_cache
  where match_key = p_match_key;

  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.is_complete then
    raise exception 'Match has already been played';
  end if;

  if v_match.scheduled_time is not null
     and v_match.scheduled_time <= (now() + interval '5 minutes') then
    raise exception 'Betting is closed for this match';
  end if;

  -- Lock and check balance
  select coalesce(sum(amount), 0) into v_balance
  from public.transactions
  where to_user_id = p_user_id
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient balance. You have % but need %', v_balance, p_amount;
  end if;

  -- Create the pool bet
  insert into public.pool_bets (user_id, match_key, side, amount)
  values (p_user_id, p_match_key, p_side, p_amount)
  returning id into v_bet_id;

  -- Escrow: debit the bettor immediately
  insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
  values (
    'adjustment',
    -p_amount,
    p_user_id,
    p_user_id,
    'Bet on ' || p_side || ' alliance — ' || p_match_key,
    'bet_escrow',
    jsonb_build_object('pool_bet_id', v_bet_id, 'match_key', p_match_key, 'side', p_side)
  );

  return v_bet_id;
end;
$$;

-- =============================================================
-- 5. RPC — Resolve match pool (payout winners)
-- =============================================================
create or replace function public.resolve_match_pool(
  p_match_key    text,
  p_winning_side text,  -- 'red', 'blue', or 'tie'
  p_result       jsonb
)
returns int  -- number of bets resolved
language plpgsql
security definer
as $$
declare
  v_total_pool    int;
  v_winning_pool  int;
  v_bet           record;
  v_payout        int;
  v_resolved      int := 0;
  v_payout_sum    int := 0;
  v_remainder     int;
  v_largest_bet_id uuid;
begin
  -- Get total pool for this match (unresolved bets only)
  select coalesce(sum(amount), 0) into v_total_pool
  from public.pool_bets
  where match_key = p_match_key and payout is null;

  if v_total_pool = 0 then
    return 0;  -- no bets to resolve
  end if;

  -- Handle tie or void: refund everyone
  if p_winning_side = 'tie' then
    for v_bet in
      select * from public.pool_bets
      where match_key = p_match_key and payout is null
    loop
      update public.pool_bets set payout = v_bet.amount where id = v_bet.id;

      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values (
        'adjustment', v_bet.amount, v_bet.user_id, v_bet.user_id,
        'Bet refund (tie) — ' || p_match_key, 'bet_refund',
        jsonb_build_object('pool_bet_id', v_bet.id, 'result', p_result)
      );

      v_resolved := v_resolved + 1;
    end loop;
    return v_resolved;
  end if;

  -- Get winning side pool
  select coalesce(sum(amount), 0) into v_winning_pool
  from public.pool_bets
  where match_key = p_match_key and side = p_winning_side and payout is null;

  -- Edge case: no one bet on winning side — refund everyone
  if v_winning_pool = 0 then
    for v_bet in
      select * from public.pool_bets
      where match_key = p_match_key and payout is null
    loop
      update public.pool_bets set payout = v_bet.amount where id = v_bet.id;

      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values (
        'adjustment', v_bet.amount, v_bet.user_id, v_bet.user_id,
        'Bet refund (no opposing bets) — ' || p_match_key, 'bet_refund',
        jsonb_build_object('pool_bet_id', v_bet.id, 'result', p_result)
      );

      v_resolved := v_resolved + 1;
    end loop;
    return v_resolved;
  end if;

  -- Pay out winners: payout = floor(their_bet * total_pool / winning_pool)
  -- Track the largest bet for remainder distribution
  v_largest_bet_id := null;

  for v_bet in
    select * from public.pool_bets
    where match_key = p_match_key and payout is null
    order by amount desc
  loop
    if v_bet.side = p_winning_side then
      -- Winner: gets proportional share of total pool
      v_payout := floor(v_bet.amount::numeric * v_total_pool / v_winning_pool);
      v_payout_sum := v_payout_sum + v_payout;

      if v_largest_bet_id is null then
        v_largest_bet_id := v_bet.id;  -- first in desc order = largest
      end if;

      update public.pool_bets set payout = v_payout where id = v_bet.id;

      insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
      values (
        'adjustment', v_payout, v_bet.user_id, v_bet.user_id,
        'Bet won on ' || p_winning_side || ' — ' || p_match_key, 'bet_won',
        jsonb_build_object('pool_bet_id', v_bet.id, 'result', p_result)
      );
    else
      -- Loser: payout = 0
      update public.pool_bets set payout = 0 where id = v_bet.id;
    end if;

    v_resolved := v_resolved + 1;
  end loop;

  -- Distribute rounding remainder to largest winner (keeps total in = total out)
  v_remainder := v_total_pool - v_payout_sum;
  if v_remainder > 0 and v_largest_bet_id is not null then
    update public.pool_bets
    set payout = payout + v_remainder
    where id = v_largest_bet_id;

    -- Add remainder to their transaction
    insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
    values (
      'adjustment', v_remainder,
      (select user_id from public.pool_bets where id = v_largest_bet_id),
      (select user_id from public.pool_bets where id = v_largest_bet_id),
      'Rounding adjustment — ' || p_match_key, 'bet_won',
      jsonb_build_object('pool_bet_id', v_largest_bet_id, 'type', 'remainder')
    );
  end if;

  return v_resolved;
end;
$$;

-- =============================================================
-- 6. RLS POLICIES
-- =============================================================
alter table public.pool_bets enable row level security;

-- Everyone authenticated can see all pool bets (public market)
create policy "Authenticated users can view pool bets"
  on public.pool_bets for select
  to authenticated
  using (true);

-- Users can insert their own bets (actual validation in RPC)
create policy "Users can place pool bets"
  on public.pool_bets for insert
  to authenticated
  with check (user_id = auth.uid());

-- Grant view access
grant select on public.match_pool_summary to authenticated;
