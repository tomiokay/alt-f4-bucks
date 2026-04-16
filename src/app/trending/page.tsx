import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getActiveEventKeys,
  getCachedMatches,
  getAllPoolSummaries,
} from "@/db/bets";
import {
  getAllOpenPredictionMarkets,
  getAllPredictionPoolSummaries,
} from "@/db/predictions";
import { calculateOdds } from "@/lib/odds";
import { TrendingView } from "@/components/trending-view";
import { AutoSync } from "@/components/auto-sync";
import type { MatchCache, PoolSummary, PredictionPoolOption } from "@/lib/types";

export const revalidate = 30;

export default async function TrendingPage() {
  const profile = await getCurrentProfile();

  const [balance, eventKeys, poolMap] = await Promise.all([
    profile ? getUserBalance(profile.id) : Promise.resolve(0),
    getActiveEventKeys(),
    getAllPoolSummaries(),
  ]);

  // Fetch all matches
  let allMatches: MatchCache[] = [];
  if (eventKeys.length > 0) {
    const arrays = await Promise.all(eventKeys.map((ek) => getCachedMatches(ek)));
    allMatches = arrays.flat();
  }

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  // Enrich matches with odds
  const enrichedMatches = allMatches.map((match) => {
    const pool = pools[match.match_key] ?? null;
    const odds = calculateOdds(pool, null);
    return { match, odds, pool };
  });

  // Sort by total bettors then pool size
  const sortedMatches = [...enrichedMatches].sort((a, b) => {
    const aBettors = a.odds.redBettors + a.odds.blueBettors;
    const bBettors = b.odds.redBettors + b.odds.blueBettors;
    if (bBettors !== aBettors) return bBettors - aBettors;
    return b.odds.totalPool - a.odds.totalPool;
  });

  // Fetch all prediction markets and pools
  const [predMarkets, predPoolsMap] = await Promise.all([
    getAllOpenPredictionMarkets(),
    getAllPredictionPoolSummaries(),
  ]);

  const predPools: Record<string, Record<string, PredictionPoolOption>> = {};
  for (const [mId, optMap] of predPoolsMap) {
    const opts: Record<string, PredictionPoolOption> = {};
    for (const [optKey, optVal] of optMap) {
      opts[optKey] = optVal;
    }
    predPools[mId] = opts;
  }

  return (
    <div className="space-y-0">
      <AutoSync />
      <TrendingView
        matches={sortedMatches}
        pools={pools}
        balance={balance}
        predictionMarkets={predMarkets}
        predictionPools={predPools}
      />
    </div>
  );
}
