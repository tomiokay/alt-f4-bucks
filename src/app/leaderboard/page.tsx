import { getLeaderboard } from "@/db/leaderboard";
import { getBiggestWinsThisWeek } from "@/db/bets";
import { LeaderboardView } from "@/components/leaderboard-view";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const [leaderboard, biggestWins] = await Promise.all([
    getLeaderboard(100),
    getBiggestWinsThisWeek(8),
  ]);

  return <LeaderboardView entries={leaderboard} biggestWins={biggestWins} />;
}
