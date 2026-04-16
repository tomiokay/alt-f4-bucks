import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getAllCachedMatches,
  getAllPoolSummaries,
  getOddsHistory,
} from "@/db/bets";
import {
  getAllOpenPredictionMarkets,
  getAllPredictionPoolSummaries,
  getRecentlyResolvedPredictionMarkets,
} from "@/db/predictions";
import { calculateOdds } from "@/lib/odds";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { BreakingNews } from "@/components/home/breaking-news";
import { HotTopics } from "@/components/home/hot-topics";
import { TrendingMarkets } from "@/components/home/trending-markets";
import { AutoSync } from "@/components/auto-sync";
import type { MatchCache, PoolSummary, MatchOdds, PredictionMarket, PredictionPoolOption } from "@/lib/types";

export const revalidate = 30;

export type EnrichedMatch = {
  match: MatchCache;
  odds: MatchOdds;
  pool: PoolSummary | null;
};

function HomeSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="rounded-xl bg-[#161b22] h-[340px]" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[#161b22] h-[160px]" />
            ))}
          </div>
        </div>
        <div className="hidden lg:block w-[320px] shrink-0 space-y-5">
          <div className="rounded-xl bg-[#161b22] h-[200px]" />
          <div className="rounded-xl bg-[#161b22] h-[150px]" />
        </div>
      </div>
    </div>
  );
}

async function HomeContent() {
  const profile = await getCurrentProfile();

  const [balance, allMatches, poolMap, allPredMarkets, allPredPoolsMap, resolvedPredMarkets] = await Promise.all([
    profile ? getUserBalance(profile.id) : Promise.resolve(0),
    getAllCachedMatches(),
    getAllPoolSummaries(),
    getAllOpenPredictionMarkets(),
    getAllPredictionPoolSummaries(),
    getRecentlyResolvedPredictionMarkets(12),
  ]);

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  const allPredPools: Record<string, Record<string, PredictionPoolOption>> = {};
  for (const [mId, optMap] of allPredPoolsMap) {
    const opts: Record<string, PredictionPoolOption> = {};
    for (const [optKey, optVal] of optMap) {
      opts[optKey] = optVal;
    }
    allPredPools[mId] = opts;
  }

  const enriched: EnrichedMatch[] = allMatches.map((match) => {
    const pool = pools[match.match_key] ?? null;
    const odds = calculateOdds(pool, null);
    return { match, odds, pool };
  });

  const now = new Date().toISOString();
  const upcoming = enriched
    .filter((e) => {
      if (e.match.is_complete) return false;
      if (e.match.scheduled_time && e.match.scheduled_time < now) return false;
      return true;
    })
    .sort((a, b) => {
      const aBettors = a.odds.redBettors + a.odds.blueBettors;
      const bBettors = b.odds.redBettors + b.odds.blueBettors;
      if (bBettors !== aBettors) return bBettors - aBettors;
      return b.odds.totalPool - a.odds.totalPool;
    });
  const completed = enriched.filter((e) =>
    e.match.is_complete || (e.match.scheduled_time && e.match.scheduled_time < now)
  );

  // Top 10 markets by pool size for the carousel
  // Include recently resolved big markets (resolved in last 3 hours)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const recentlyResolvedBig = completed.filter((e) => {
    if (!e.match.is_complete) return false;
    const resolvedTime = e.match.actual_time ?? e.match.scheduled_time ?? "";
    return resolvedTime >= threeHoursAgo && e.odds.totalPool >= 500;
  });
  const allByPool = [...upcoming, ...recentlyResolvedBig].sort((a, b) => b.odds.totalPool - a.odds.totalPool);
  const topMarkets = allByPool.filter((e) => e.odds.totalPool > 0).slice(0, 10);
  const featured = topMarkets[0] ?? null;
  const featuredHistory = featured ? await getOddsHistory(featured.match.match_key) : [];

  const carouselPredMarkets = allPredMarkets.filter((m) => {
    if (m.status !== "open") return false;
    // Only show in carousel if someone has bet on it
    const marketPools = allPredPools[m.id];
    if (!marketPools) return false;
    const totalPool = Object.values(marketPools).reduce((sum, p) => sum + p.pool, 0);
    if (totalPool <= 0) return false;
    // Include event-level markets and score predictions with enough bets
    if (m.match_key === null && (m.type === "event_winner" || m.type === "ranking_top1" || m.type === "ranking_position")) return true;
    if (m.type === "score_prediction" && totalPool >= 50) return true;
    return false;
  });

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentCompleted = completed.filter((e) => {
    const time = e.match.actual_time ?? e.match.scheduled_time ?? "";
    return time >= twoWeeksAgo;
  });
  const breaking = [...recentCompleted]
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
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        <FeaturedCarousel
          featured={featured}
          topMarkets={topMarkets}
          pools={pools}
          predictions={{}}
          balance={balance}
          oddsHistory={featuredHistory}
          predictionMarkets={carouselPredMarkets}
          predictionPools={allPredPools}
        />
        <TrendingMarkets
          matches={upcoming}
          completed={recentCompleted}
          pools={pools}
          balance={balance}
          predictionMarkets={allPredMarkets}
          predictionPools={allPredPools}
          resolvedPredictionMarkets={resolvedPredMarkets}
        />
        <div className="lg:hidden space-y-5">
          <BreakingNews items={breaking} allCompleted={recentCompleted} />
          <HotTopics topics={hotTopics} />
        </div>
      </div>
      <div className="hidden lg:block w-[320px] shrink-0 space-y-5">
        <BreakingNews items={breaking} allCompleted={recentCompleted} />
        <HotTopics topics={hotTopics} />
      </div>
    </div>
  );
}

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-0">
      <AutoSync />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
