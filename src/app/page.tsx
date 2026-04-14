import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getActiveEventKeys,
  getCachedMatches,
  getAllPoolSummaries,
} from "@/db/bets";
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

  const [balance, eventKeys, poolMap] = await Promise.all([
    profile ? getUserBalance(profile.id) : Promise.resolve(0),
    getActiveEventKeys(),
    getAllPoolSummaries(),
  ]);

  let allMatches: MatchCache[] = [];
  if (eventKeys.length > 0) {
    const arrays = await Promise.all(eventKeys.map((ek) => getCachedMatches(ek)));
    allMatches = arrays.flat();
  }

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  // Enrich matches — use pool data only (skip slow Statbotics calls on home page)
  const enriched: EnrichedMatch[] = allMatches.map((match) => {
    const pool = pools[match.match_key] ?? null;
    const odds = calculateOdds(pool, null);
    return { match, odds, pool };
  });

  // Only show matches that haven't started yet OR have no scheduled time
  const now = new Date().toISOString();
  const upcoming = enriched
    .filter((e) => {
      if (e.match.is_complete) return false;
      // If scheduled in the past, treat as completed/in-progress
      if (e.match.scheduled_time && e.match.scheduled_time < now) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = a.match.scheduled_time ?? "9999";
      const bTime = b.match.scheduled_time ?? "9999";
      return aTime.localeCompare(bTime);
    });
  const completed = enriched.filter((e) =>
    e.match.is_complete || (e.match.scheduled_time && e.match.scheduled_time < now)
  );

  const featured = [...upcoming].sort((a, b) => b.odds.totalPool - a.odds.totalPool)[0] ?? null;
  const trending = [...upcoming].sort((a, b) => b.odds.totalPool - a.odds.totalPool).slice(0, 12);

  const breaking = [...completed]
    .sort((a, b) => {
      const aTime = a.match.actual_time ?? a.match.scheduled_time ?? "";
      const bTime = b.match.actual_time ?? b.match.scheduled_time ?? "";
      return bTime.localeCompare(aTime);
    })
    .slice(0, 5);

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
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          {featured && (
            <FeaturedMarket
              featured={featured}
              pools={pools}
              predictions={{}}
              balance={balance}
            />
          )}
          <AllMarkets
            upcoming={upcoming}
            trending={trending}
            completed={completed}
            pools={pools}
            predictions={{}}
            balance={balance}
            hotTopics={hotTopics}
          />
        </div>
        <div className="hidden lg:block w-[320px] shrink-0 space-y-5">
          <BreakingNews items={breaking} />
          <HotTopics topics={hotTopics} />
        </div>
      </div>
    </div>
  );
}
