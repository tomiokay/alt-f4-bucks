import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { getLeaderboard } from "@/db/leaderboard";
import { Trophy } from "lucide-react";

export const revalidate = 30;

export default async function HomePage() {
  const leaderboard = await getLeaderboard(25);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="space-y-2 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">Alt-F4 Bucks</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          The reward system for FRC Team 7558. Earn Bucks by contributing to the
          team, climb the leaderboard, and spend your balance in the team store.
        </p>
      </section>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2 sm:px-6">
          <LeaderboardTable entries={leaderboard} />
        </CardContent>
      </Card>
    </div>
  );
}
