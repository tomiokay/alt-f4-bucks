import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getActiveEventKeys,
  getCachedMatches,
  getAllPoolSummaries,
  getOddsHistory,
} from "@/db/bets";
import { getEventPredictionMarkets, getAllPredictionPools } from "@/db/predictions";
import { calculateOdds } from "@/lib/odds";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { BreakingNews } from "@/components/home/breaking-news";
import { HotTopics } from "@/components/home/hot-topics";
import { AllMarkets } from "@/components/home/all-markets";
import { AutoSync } from "@/components/auto-sync";
import { HowItWorksButton } from "@/components/how-it-works";
import type { MatchCache, PoolSummary, MatchOdds, PredictionMarket, PredictionPoolOption } from "@/lib/types";

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
  const featuredHistory = featured ? await getOddsHistory(featured.match.match_key) : [];
  const trending = [...upcoming].sort((a, b) => b.odds.totalPool - a.odds.totalPool).slice(0, 12);

  // Fetch event-level prediction markets (event_winner, ranking_top1)
  const allPredMarkets: PredictionMarket[] = [];
  const allPredPools: Record<string, Record<string, PredictionPoolOption>> = {};
  for (const ek of eventKeys) {
    try {
      const markets = await getEventPredictionMarkets(ek);
      const eventLevelMarkets = markets.filter(
        (m) => m.status === "open" && m.match_key === null && (m.type === "event_winner" || m.type === "ranking_top1" || m.type === "ranking_position")
      );
      allPredMarkets.push(...eventLevelMarkets);

      // Fetch pools for these markets
      const poolsMap = await getAllPredictionPools(ek);
      for (const [mId, optMap] of poolsMap) {
        const opts: Record<string, PredictionPoolOption> = {};
        for (const [optKey, optVal] of optMap) {
          opts[optKey] = optVal;
        }
        allPredPools[mId] = opts;
      }
    } catch {
      // Prediction tables may not exist yet
    }
  }

  const breaking = [...completed]
    .sort((a, b) => {
      const aTime = a.match.actual_time ?? a.match.scheduled_time ?? "";
      const bTime = b.match.actual_time ?? b.match.scheduled_time ?? "";
      return bTime.localeCompare(aTime);
    })
    .slice(0, 5);

  const eventMap = new Map<string, { key: string; name: string; count: number; volume: number; startTime: string | null }>();
  for (const e of upcoming) {
    const existing = eventMap.get(e.match.event_key);
    const time = e.match.scheduled_time;
    if (existing) {
      existing.count++;
      existing.volume += e.odds.totalPool;
      if (time && (!existing.startTime || time < existing.startTime)) {
        existing.startTime = time;
      }
    } else {
      eventMap.set(e.match.event_key, {
        key: e.match.event_key,
        name: e.match.event_name,
        count: 1,
        volume: e.odds.totalPool,
        startTime: time,
      });
    }
  }
  const hotTopics = [...eventMap.values()].sort((a, b) => {
    const aTime = a.startTime ?? "9999";
    const bTime = b.startTime ?? "9999";
    return aTime.localeCompare(bTime);
  });

  return (
    <div className="space-y-0">
      <AutoSync />
      {/* How it works link */}
      <div className="flex justify-end mb-3">
        <HowItWorksButton />
      </div>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <FeaturedCarousel
            featured={featured}
            pools={pools}
            predictions={{}}
            balance={balance}
            oddsHistory={featuredHistory}
            predictionMarkets={allPredMarkets}
            predictionPools={allPredPools}
          />
          <AllMarkets
            upcoming={upcoming}
            trending={trending}
            completed={completed}
            pools={pools}
            predictions={{}}
            balance={balance}
            hotTopics={hotTopics}
          />
          {/* Breaking news + hot topics — mobile (below markets) */}
          <div className="lg:hidden space-y-5">
            <BreakingNews items={breaking} allCompleted={completed} />
            <HotTopics topics={hotTopics} />
          </div>
        </div>
        {/* Sidebar — desktop */}
        <div className="hidden lg:block w-[320px] shrink-0 space-y-5">
          <BreakingNews items={breaking} allCompleted={completed} />
          <HotTopics topics={hotTopics} />
        </div>
      </div>
    </div>
  );
}
