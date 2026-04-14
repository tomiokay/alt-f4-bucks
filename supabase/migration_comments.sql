-- =============================================================
-- Alt-F4 Bucks — Comments Migration
-- Run in Supabase SQL Editor
-- =============================================================

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id),
  match_key   text not null,
  body        text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  parent_id   uuid references public.comments(id),
  created_at  timestamptz not null default now()
);

create index idx_comments_match on public.comments(match_key, created_at desc);
create index idx_comments_user on public.comments(user_id);
create index idx_comments_parent on public.comments(parent_id);

alter table public.comments enable row level security;

create policy "Anyone authenticated can view comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "Users can insert own comments"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own comments"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid());
