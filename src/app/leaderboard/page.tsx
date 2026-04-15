import { getLeaderboard } from "@/db/leaderboard";
import { LeaderboardView } from "@/components/leaderboard-view";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard(100);

  return <LeaderboardView entries={leaderboard} />;
}
