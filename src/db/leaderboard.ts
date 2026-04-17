import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/lib/types";

export async function getLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leaderboard_view")
    .select("*")
    .order("portfolio_value", { ascending: false })
    .limit(limit);

  return (data ?? []) as LeaderboardEntry[];
}
