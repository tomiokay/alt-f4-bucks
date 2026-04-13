import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getActiveEventKeys,
  getCachedMatches,
  getAllPoolSummaries,
} from "@/db/bets";
import { getEventPredictions } from "@/lib/statbotics";
import { calculateOdds } from "@/lib/odds";
import { FeaturedMarket } from "@/components/home/featured-market";
import { BreakingNews } from "@/components/home/breaking-news";
import { HotTopics } from "@/components/home/hot-topics";
import { AllMarkets } from "@/components/home/all-markets";
import { AutoSync } from "@/components/auto-sync";
import type { MatchCache, PoolSummary, MatchOdds } from "@/lib/types";

export const revalidate = 30;

export type EnrichedMatch = {
  match: MatchCache;
  odds: MatchOdds;
  pool: PoolSummary | null;
};

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const balance = profile ? await getUserBalance(profile.id) : 0;

  const eventKeys = await getActiveEventKeys();
  const poolMap = await getAllPoolSummaries();

  let allMatches: MatchCache[] = [];
  if (eventKeys.length > 0) {
    const arrays = await Promise.all(eventKeys.map((ek) => getCachedMatches(ek)));
    allMatches = arrays.flat();
  }

  const predictions: Record<string, { redWinProb: number; blueWinProb: number }> = {};
  for (const ek of eventKeys) {
    const preds = await getEventPredictions(ek);
    for (const [key, val] of preds) {
      predictions[key] = val;
    }
  }

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  // Enrich all matches
  const enriched: EnrichedMatch[] = allMatches.map((match) => {
    const pool = pools[match.match_key] ?? null;
    const odds = calculateOdds(pool, predictions[match.match_key] ?? null);
    return { match, odds, pool };
  });

  // Split into categories
  const upcoming = enriched.filter((e) => !e.match.is_complete);
  const completed = enriched.filter((e) => e.match.is_complete);

  // Featured: highest volume upcoming match
  const featured = [...upcoming].sort((a, b) => b.odds.totalPool - a.odds.totalPool)[0] ?? null;

  // Trending: top by volume
  const trending = [...upcoming].sort((a, b) => b.odds.totalPool - a.odds.totalPool).slice(0, 12);

  // Breaking: recently completed
  const breaking = [...completed]
    .sort((a, b) => {
      const aTime = a.match.actual_time ?? a.match.scheduled_time ?? "";
      const bTime = b.match.actual_time ?? b.match.scheduled_time ?? "";
      return bTime.localeCompare(aTime);
    })
    .slice(0, 5);

  // Hot topics: unique events with match counts
  const eventMap = new Map<string, { key: string; name: string; count: number; volume: number }>();
  for (const e of enriched) {
    const existing = eventMap.get(e.match.event_key);
    if (existing) {
      existing.count++;
      existing.volume += e.odds.totalPool;
    } else {
      eventMap.set(e.match.event_key, {
        key: e.match.event_key,
        name: e.match.event_name,
        count: 1,
        volume: e.odds.totalPool,
      });
    }
  }
  const hotTopics = [...eventMap.values()].sort((a, b) => b.volume - a.volume);

  return (
    <div className="space-y-0">
      <AutoSync />

      {/* Main layout: 2 columns */}
      <div className="flex gap-6">
        {/* Left column — main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Featured market with chart */}
          {featured && (
            <FeaturedMarket
              featured={featured}
              pools={pools}
              predictions={predictions}
              balance={balance}
            />
          )}

          {/* All markets */}
          <AllMarkets
            upcoming={upcoming}
            trending={trending}
            completed={completed}
            pools={pools}
            predictions={predictions}
            balance={balance}
            hotTopics={hotTopics}
          />
        </div>

        {/* Right sidebar */}
        <div className="hidden lg:block w-[320px] shrink-0 space-y-5">
          <BreakingNews items={breaking} />
          <HotTopics topics={hotTopics} />
        </div>
      </div>
    </div>
  );
}
