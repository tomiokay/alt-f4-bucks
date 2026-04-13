-- =============================================================
-- Alt-F4 Bucks — Betting System Migration
-- Run this AFTER schema.sql in Supabase SQL Editor
-- =============================================================

-- =============================================================
-- 1. TABLES
-- =============================================================

-- Match cache (TBA data stored locally)
create table public.match_cache (
  match_key       text primary key,
  event_key       text not null,
  event_name      text not null,
  comp_level      text not null,
  match_number    integer not null,
  red_teams       text[] not null,
  blue_teams      text[] not null,
  scheduled_time  timestamptz,
  actual_time     timestamptz,
  red_score       integer,
  blue_score      integer,
  winning_alliance text,
  is_complete     boolean not null default false,
  fetched_at      timestamptz not null default now()
);

-- Bets (peer-to-peer wagers on FRC matches)
create table public.bets (
  id              uuid primary key default gen_random_uuid(),
  proposer_id     uuid not null references public.profiles(id),
  opponent_id     uuid not null references public.profiles(id),
  match_key       text not null references public.match_cache(match_key),
  event_key       text not null,
  bet_type        text not null check (bet_type in ('match_winner', 'over_under', 'exact_score', 'closest_score')),
  bet_details     jsonb not null default '{}'::jsonb,
  wager_amount    integer not null check (wager_amount > 0),
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'resolved', 'voided')),
  winner_id       uuid references public.profiles(id),
  result_data     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  constraint bets_different_players check (proposer_id != opponent_id)
);

-- =============================================================
-- 2. INDEXES
-- =============================================================
create index idx_bets_proposer       on public.bets(proposer_id);
create index idx_bets_opponent       on public.bets(opponent_id);
create index idx_bets_match          on public.bets(match_key);
create index idx_bets_status         on public.bets(status);
create index idx_bets_created        on public.bets(created_at desc);
create index idx_match_cache_event   on public.match_cache(event_key);
create index idx_match_cache_complete on public.match_cache(is_complete) where is_complete = false;

-- =============================================================
-- 3. UPDATE TRIGGER — auto-set updated_at
-- =============================================================
create or replace function public.set_bet_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bets_updated_at
  before update on public.bets
  for each row execute function public.set_bet_updated_at();

-- =============================================================
-- 4. RPC — Atomic accept_bet (escrow both wagers)
-- =============================================================
create or replace function public.accept_bet(p_bet_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_bet           public.bets%rowtype;
  v_proposer_bal  int;
  v_opponent_bal  int;
begin
  -- Lock the bet row
  select * into v_bet
  from public.bets
  where id = p_bet_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  if v_bet.status != 'pending' then
    raise exception 'Bet is no longer pending';
  end if;

  if v_bet.opponent_id != p_user_id then
    raise exception 'You are not the opponent on this bet';
  end if;

  -- Check match hasn't started (5 min cutoff)
  declare
    v_match public.match_cache%rowtype;
  begin
    select * into v_match
    from public.match_cache
    where match_key = v_bet.match_key;

    if v_match.is_complete then
      raise exception 'Match has already been played';
    end if;

    if v_match.scheduled_time is not null
       and v_match.scheduled_time <= (now() + interval '5 minutes') then
      raise exception 'Betting is closed for this match (starts within 5 minutes)';
    end if;
  end;

  -- Lock and check proposer balance
  select coalesce(sum(amount), 0) into v_proposer_bal
  from public.transactions
  where to_user_id = v_bet.proposer_id
  for update;

  if v_proposer_bal < v_bet.wager_amount then
    raise exception 'Proposer no longer has sufficient balance';
  end if;

  -- Lock and check opponent balance
  select coalesce(sum(amount), 0) into v_opponent_bal
  from public.transactions
  where to_user_id = v_bet.opponent_id
  for update;

  if v_opponent_bal < v_bet.wager_amount then
    raise exception 'You do not have enough Alt-F4 Bucks';
  end if;

  -- Create escrow transactions (debit both players)
  insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
  values
    ('adjustment', -v_bet.wager_amount, v_bet.proposer_id, v_bet.proposer_id,
     'Bet escrow: wagered on ' || v_bet.match_key, 'bet_escrow',
     jsonb_build_object('bet_id', v_bet.id)),
    ('adjustment', -v_bet.wager_amount, v_bet.opponent_id, v_bet.opponent_id,
     'Bet escrow: wagered on ' || v_bet.match_key, 'bet_escrow',
     jsonb_build_object('bet_id', v_bet.id));

  -- Update bet status
  update public.bets
  set status = 'accepted'
  where id = p_bet_id;

  return p_bet_id;
end;
$$;

-- =============================================================
-- 5. RPC — Atomic resolve_bet (payout to winner)
-- =============================================================
create or replace function public.resolve_bet(
  p_bet_id     uuid,
  p_winner_id  uuid,
  p_result     jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_bet public.bets%rowtype;
begin
  -- Lock the bet row
  select * into v_bet
  from public.bets
  where id = p_bet_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  if v_bet.status != 'accepted' then
    raise exception 'Bet is not in accepted state';
  end if;

  if p_winner_id is not null then
    -- Someone won — pay out 2x wager
    insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
    values (
      'adjustment',
      v_bet.wager_amount * 2,
      p_winner_id,
      p_winner_id,
      'Bet won on ' || v_bet.match_key,
      'bet_won',
      jsonb_build_object('bet_id', v_bet.id)
    );
  else
    -- Tie/void — refund both players
    insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
    values
      ('adjustment', v_bet.wager_amount, v_bet.proposer_id, v_bet.proposer_id,
       'Bet refund (tie) on ' || v_bet.match_key, 'bet_refund',
       jsonb_build_object('bet_id', v_bet.id)),
      ('adjustment', v_bet.wager_amount, v_bet.opponent_id, v_bet.opponent_id,
       'Bet refund (tie) on ' || v_bet.match_key, 'bet_refund',
       jsonb_build_object('bet_id', v_bet.id));
  end if;

  -- Update bet
  update public.bets
  set status = 'resolved',
      winner_id = p_winner_id,
      result_data = p_result,
      resolved_at = now()
  where id = p_bet_id;
end;
$$;

-- =============================================================
-- 6. RLS POLICIES
-- =============================================================

alter table public.match_cache enable row level security;
alter table public.bets enable row level security;

-- --- MATCH CACHE ---
-- Anyone authenticated can read match data
create policy "Authenticated users can view match cache"
  on public.match_cache for select
  to authenticated
  using (true);

-- Only service role inserts/updates (via API sync)
-- No insert/update policies for authenticated — handled by service role client

-- --- BETS ---
-- Users can see bets they're involved in; managers/admins see all
create policy "Users can view own bets"
  on public.bets for select
  to authenticated
  using (
    proposer_id = auth.uid()
    or opponent_id = auth.uid()
    or public.is_manager_or_admin()
  );

-- Users can create bets (as proposer)
create policy "Users can create bets"
  on public.bets for insert
  to authenticated
  with check (proposer_id = auth.uid());

-- Users can update own pending bets (cancel)
create policy "Users can update own bets"
  on public.bets for update
  to authenticated
  using (
    (proposer_id = auth.uid() and status = 'pending')
    or (opponent_id = auth.uid() and status = 'pending')
    or public.is_manager_or_admin()
  );

-- =============================================================
-- 7. Update transaction type constraint to allow bet categories
-- =============================================================
-- The existing transactions table uses type check constraint.
-- Bet transactions use type='adjustment' with category='bet_escrow'/'bet_won'/'bet_refund',
-- which already fits within the existing constraint. No schema change needed.
