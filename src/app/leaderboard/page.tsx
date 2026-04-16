import { redirect } from "next/navigation";
import { getLeaderboard } from "@/db/leaderboard";
import { getBiggestWinsThisWeek } from "@/db/bets";
import { getCurrentProfile } from "@/db/profiles";
import { getUserLeaderboards } from "@/db/custom-leaderboards";
import { LeaderboardView } from "@/components/leaderboard-view";
import { CustomLeaderboardsPanel } from "@/components/custom-leaderboards-panel";
import { getAllProfiles } from "@/db/profiles";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [leaderboard, biggestWins, customBoards, allProfiles] = await Promise.all([
    getLeaderboard(100),
    getBiggestWinsThisWeek(8),
    profile ? getUserLeaderboards(profile.id) : Promise.resolve([]),
    profile ? getAllProfiles() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <LeaderboardView entries={leaderboard} biggestWins={biggestWins} />
      {profile && (
        <CustomLeaderboardsPanel
          boards={customBoards}
          allProfiles={allProfiles}
          userId={profile.id}
          globalEntries={leaderboard}
        />
      )}
    </div>
  );
}
