-- =============================================================
-- Alt-F4 Bucks — Odds History Migration
-- Records odds after every bet for real probability charts
-- Run in Supabase SQL Editor
-- =============================================================

create table public.odds_history (
  id          uuid primary key default gen_random_uuid(),
  match_key   text not null,
  red_pct     integer not null,
  blue_pct    integer not null,
  red_pool    integer not null default 0,
  blue_pool   integer not null default 0,
  total_pool  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_odds_history_match on public.odds_history(match_key, created_at);

alter table public.odds_history enable row level security;

create policy "Anyone authenticated can view odds history"
  on public.odds_history for select
  to authenticated
  using (true);

-- Automatically record odds after every bet
create or replace function public.record_odds_after_bet()
returns trigger
language plpgsql
security definer
as $$
declare
  v_red_pool int;
  v_blue_pool int;
  v_total int;
  v_red_pct int;
begin
  select
    coalesce(sum(amount) filter (where side = 'red'), 0),
    coalesce(sum(amount) filter (where side = 'blue'), 0)
  into v_red_pool, v_blue_pool
  from public.pool_bets
  where match_key = NEW.match_key and payout is null;

  v_total := v_red_pool + v_blue_pool;

  if v_total > 0 then
    v_red_pct := round(v_red_pool::numeric / v_total * 100);
  else
    v_red_pct := 50;
  end if;

  insert into public.odds_history (match_key, red_pct, blue_pct, red_pool, blue_pool, total_pool)
  values (NEW.match_key, v_red_pct, 100 - v_red_pct, v_red_pool, v_blue_pool, v_total);

  return NEW;
end;
$$;

create trigger after_pool_bet_insert
  after insert on public.pool_bets
  for each row execute function public.record_odds_after_bet();
