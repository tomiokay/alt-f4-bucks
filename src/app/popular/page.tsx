import { redirect } from "next/navigation";
import { AutoSync } from "@/components/auto-sync";
import { PopularMarkets } from "@/components/popular-markets";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getActiveEventKeys,
  getCachedMatches,
  getAllPoolSummaries,
} from "@/db/bets";
import { calculateOdds } from "@/lib/odds";
import type { MatchCache, PoolSummary, MatchOdds } from "@/lib/types";

export default async function PopularPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [balance, eventKeys, poolMap] = await Promise.all([
    getUserBalance(profile.id),
    getActiveEventKeys(),
    getAllPoolSummaries(),
  ]);

  let allMatches: MatchCache[] = [];
  if (eventKeys.length > 0) {
    const arrays = await Promise.all(eventKeys.map((ek) => getCachedMatches(ek)));
    allMatches = arrays.flat();
  }

  // Skip Statbotics — use pool odds only for speed
  const predictions: Record<string, { redWinProb: number; blueWinProb: number }> = {};

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  type RankedMatch = {
    match: MatchCache;
    odds: MatchOdds;
    pool: PoolSummary | null;
  };

  const upcoming = allMatches.filter((m) => !m.is_complete);

  const ranked: RankedMatch[] = upcoming
    .map((match) => {
      const pool = pools[match.match_key] ?? null;
      const odds = calculateOdds(pool, null);
      return { match, odds, pool };
    })
    .sort((a, b) => {
      const volDiff = b.odds.totalPool - a.odds.totalPool;
      if (volDiff !== 0) return volDiff;
      const bettorDiff =
        (b.odds.redBettors + b.odds.blueBettors) -
        (a.odds.redBettors + a.odds.blueBettors);
      if (bettorDiff !== 0) return bettorDiff;
      return Math.abs(a.odds.redPct - 50) - Math.abs(b.odds.redPct - 50);
    });

  const completedRanked: RankedMatch[] = allMatches
    .filter((m) => m.is_complete)
    .map((match) => {
      const pool = pools[match.match_key] ?? null;
      const odds = calculateOdds(pool, null);
      return { match, odds, pool };
    })
    .sort((a, b) => b.odds.totalPool - a.odds.totalPool)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <AutoSync />
      <div>
        <h1 className="text-lg font-semibold text-foreground">Popular</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Trending markets by volume and activity
        </p>
      </div>

      <PopularMarkets
        trending={ranked}
        recentResults={completedRanked}
        pools={pools}
        predictions={predictions}
        balance={balance}
      />
    </div>
  );
}
