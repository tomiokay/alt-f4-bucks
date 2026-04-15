-- Update leaderboard view to include team_number
-- Must drop + recreate because adding a column in the middle isn't allowed with CREATE OR REPLACE
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
