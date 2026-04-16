import { createClient } from "@/lib/supabase/server";
import type { CustomLeaderboard, LeaderboardEntry } from "@/lib/types";

export async function getUserLeaderboards(userId: string): Promise<(CustomLeaderboard & { member_count: number })[]> {
  const supabase = await createClient();

  // Get leaderboard IDs user is a member of
  const { data: memberships } = await supabase
    .from("custom_leaderboard_members")
    .select("leaderboard_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const ids = memberships.map((m) => m.leaderboard_id);

  const { data: boards } = await supabase
    .from("custom_leaderboards")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (!boards) return [];

  // Get member counts
  const result: (CustomLeaderboard & { member_count: number })[] = [];
  for (const board of boards) {
    const { count } = await supabase
      .from("custom_leaderboard_members")
      .select("*", { count: "exact", head: true })
      .eq("leaderboard_id", board.id);

    result.push({ ...(board as CustomLeaderboard), member_count: count ?? 0 });
  }

  return result;
}

export async function getLeaderboardMembers(leaderboardId: string): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  // Get member user IDs
  const { data: members } = await supabase
    .from("custom_leaderboard_members")
    .select("user_id")
    .eq("leaderboard_id", leaderboardId);

  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);

  // Get their leaderboard entries
  const { data: entries } = await supabase
    .from("leaderboard_view")
    .select("*")
    .in("user_id", userIds)
    .order("balance", { ascending: false });

  return (entries ?? []) as LeaderboardEntry[];
}

export async function getLeaderboardById(id: string): Promise<CustomLeaderboard | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_leaderboards")
    .select("*")
    .eq("id", id)
    .single();

  return data as CustomLeaderboard | null;
}
