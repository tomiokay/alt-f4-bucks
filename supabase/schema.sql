-- =============================================================
-- Alt-F4 Bucks — Full Database Schema
-- Run this in Supabase SQL Editor (or via psql)
-- =============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- =============================================================
-- 1. TABLES
-- =============================================================

-- Profiles (extends auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role        text not null default 'member'
                check (role in ('member', 'manager', 'admin')),
  created_at  timestamptz not null default now()
);

-- Transactions (the ledger — balances are computed from this)
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('award', 'purchase', 'adjustment')),
  amount      int not null,
  to_user_id  uuid not null references public.profiles(id),
  by_user_id  uuid references public.profiles(id),
  reason      text,
  category    text,
  meta        jsonb not null default '{}'::jsonb
);

-- Store items
create table public.store_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       int not null check (price >= 0),
  active      boolean not null default true,
  stock       int,
  image_url   text,
  created_at  timestamptz not null default now()
);

-- Purchases
create table public.purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id),
  item_id     uuid not null references public.store_items(id),
  quantity    int not null check (quantity > 0),
  total_price int not null,
  created_at  timestamptz not null default now(),
  status      text not null default 'completed'
);

-- =============================================================
-- 2. INDEXES
-- =============================================================
create index idx_transactions_to_user   on public.transactions(to_user_id);
create index idx_transactions_by_user   on public.transactions(by_user_id);
create index idx_transactions_created   on public.transactions(created_at desc);
create index idx_purchases_user         on public.purchases(user_id);
create index idx_store_items_active     on public.store_items(active) where active = true;

-- =============================================================
-- 3. VIEW — Leaderboard
-- =============================================================
create or replace view public.leaderboard_view as
select
  p.id          as user_id,
  p.display_name,
  coalesce(sum(t.amount), 0)::int as balance
from public.profiles p
left join public.transactions t on t.to_user_id = p.id
group by p.id, p.display_name
order by balance desc;

-- =============================================================
-- 4. RPC — Atomic purchase function (prevents race conditions)
-- =============================================================
create or replace function public.purchase_item(
  p_user_id  uuid,
  p_item_id  uuid,
  p_quantity int
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_item       public.store_items%rowtype;
  v_balance    int;
  v_total      int;
  v_purchase_id uuid;
begin
  -- Lock the item row to prevent concurrent stock issues
  select * into v_item
  from public.store_items
  where id = p_item_id and active = true
  for update;

  if not found then
    raise exception 'Item not found or not active';
  end if;

  v_total := v_item.price * p_quantity;

  -- Check stock
  if v_item.stock is not null then
    if v_item.stock < p_quantity then
      raise exception 'Insufficient stock';
    end if;
  end if;

  -- Compute current balance (lock transactions for this user)
  select coalesce(sum(amount), 0) into v_balance
  from public.transactions
  where to_user_id = p_user_id
  for update;

  if v_balance < v_total then
    raise exception 'Insufficient balance. You have % but need %', v_balance, v_total;
  end if;

  -- Create purchase record
  insert into public.purchases (user_id, item_id, quantity, total_price)
  values (p_user_id, p_item_id, p_quantity, v_total)
  returning id into v_purchase_id;

  -- Create negative transaction
  insert into public.transactions (type, amount, to_user_id, by_user_id, reason, category, meta)
  values (
    'purchase',
    -v_total,
    p_user_id,
    p_user_id,
    'Purchased ' || p_quantity || 'x ' || v_item.name,
    'purchase',
    jsonb_build_object('purchase_id', v_purchase_id, 'item_id', p_item_id)
  );

  -- Deduct stock if tracked
  if v_item.stock is not null then
    update public.store_items
    set stock = stock - p_quantity
    where id = p_item_id;
  end if;

  return v_purchase_id;
end;
$$;

-- =============================================================
-- 5. RLS POLICIES
-- =============================================================

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.store_items enable row level security;
alter table public.purchases enable row level security;

-- Helper: check if current user is manager or admin
create or replace function public.is_manager_or_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('manager', 'admin')
  );
$$;

-- --- PROFILES ---
-- Anyone authenticated can read all profiles (needed for leaderboard, member selection)
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update their own display_name
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Profiles are inserted via trigger (see below)
create policy "Allow insert for own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- --- TRANSACTIONS ---
-- Users see own transactions; managers/admins see all
create policy "Users can view own transactions"
  on public.transactions for select
  to authenticated
  using (
    to_user_id = auth.uid()
    or by_user_id = auth.uid()
    or public.is_manager_or_admin()
  );

-- Only managers/admins can insert award/adjustment transactions
create policy "Managers can insert award/adjustment transactions"
  on public.transactions for insert
  to authenticated
  with check (
    (type in ('award', 'adjustment') and public.is_manager_or_admin())
    or type = 'purchase'
  );

-- --- STORE ITEMS ---
-- Anyone authenticated can view active items
create policy "Authenticated users can view active store items"
  on public.store_items for select
  to authenticated
  using (active = true or public.is_manager_or_admin());

-- Managers/admins can insert/update store items
create policy "Managers can insert store items"
  on public.store_items for insert
  to authenticated
  with check (public.is_manager_or_admin());

create policy "Managers can update store items"
  on public.store_items for update
  to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- --- PURCHASES ---
-- Users see own purchases; managers/admins see all
create policy "Users can view own purchases"
  on public.purchases for select
  to authenticated
  using (user_id = auth.uid() or public.is_manager_or_admin());

create policy "Users can insert own purchases"
  on public.purchases for insert
  to authenticated
  with check (user_id = auth.uid());

-- =============================================================
-- 6. TRIGGER — Auto-create profile on signup
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 7. Grant access to the leaderboard view for anon (public page)
-- =============================================================
grant select on public.leaderboard_view to anon;
grant select on public.leaderboard_view to authenticated;
