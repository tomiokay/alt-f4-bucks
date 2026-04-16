"use client";

import { useState } from "react";
import { MarketCard } from "./market-card";
import { PredictionMarketCard } from "@/components/prediction-market-card";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import { cn } from "@/lib/utils";
import type { EnrichedMatch } from "@/app/page";
import type {
  MatchCache,
  PoolSummary,
  PredictionMarket,
  PredictionPoolOption,
} from "@/lib/types";

type Props = {
  matches: EnrichedMatch[];
  completed: EnrichedMatch[];
  pools: Record<string, PoolSummary>;
  balance: number;
  predictionMarkets: PredictionMarket[];
  predictionPools: Record<string, Record<string, PredictionPoolOption>>;
  resolvedPredictionMarkets?: PredictionMarket[];
};

type TabKey = "all" | "matches" | "events" | "rankings" | "custom";
type SortKey = "activity" | "volume" | "newest";

export function TrendingMarkets({
  matches,
  completed,
  pools,
  balance,
  predictionMarkets,
  predictionPools,
  resolvedPredictionMarkets = [],
}: Props) {
  const [tab, setTab] = useState<TabKey>("all");
  const [sort, setSort] = useState<SortKey>("activity");
  const [slipMatch, setSlipMatch] = useState<MatchCache | null>(null);
  const [slipSide, setSlipSide] = useState<"red" | "blue">("red");
  const [slipOpen, setSlipOpen] = useState(false);

  function openSlip(match: MatchCache, side: "red" | "blue") {
    setSlipMatch(match);
    setSlipSide(side);
    setSlipOpen(true);
  }

  // Helpers
  function getPredStats(marketId: string) {
    const opts = predictionPools[marketId] ?? {};
    let pool = 0;
    let bettors = 0;
    for (const o of Object.values(opts)) {
      pool += o.pool;
      bettors += o.bettors;
    }
    return { pool, bettors };
  }

  // Filter out match-specific prediction types (shown on market pages instead)
  const browsableMarkets = predictionMarkets.filter(
    (m) => m.type !== "score_prediction" && m.type !== "score_over_under"
  );

  // Filter prediction markets
  const eventWinnerMarkets = browsableMarkets.filter((m) => m.type === "event_winner");
  const rankingMarkets = browsableMarkets.filter(
    (m) => m.type === "ranking_top1" || m.type === "ranking_top8" || m.type === "ranking_position"
  );
  const customMarkets = browsableMarkets.filter((m) => m.is_custom);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: matches.length + browsableMarkets.length },
    { key: "matches", label: "Matches", count: matches.length },
    { key: "events", label: "Event Winners", count: eventWinnerMarkets.length },
    { key: "rankings", label: "Rankings", count: rankingMarkets.length },
    { key: "custom", label: "Custom", count: customMarkets.length },
  ];

  const sorts: { key: SortKey; label: string }[] = [
    { key: "activity", label: "Most Active" },
    { key: "volume", label: "Highest Volume" },
    { key: "newest", label: "Newest" },
  ];

  // Sort helpers
  function sortPredMarkets(list: PredictionMarket[]): PredictionMarket[] {
    return [...list].sort((a, b) => {
      const aStats = getPredStats(a.id);
      const bStats = getPredStats(b.id);
      if (sort === "activity") {
        if (bStats.bettors !== aStats.bettors) return bStats.bettors - aStats.bettors;
        return bStats.pool - aStats.pool;
      }
      if (sort === "volume") return bStats.pool - aStats.pool;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function sortMatches(list: EnrichedMatch[]): EnrichedMatch[] {
    return [...list].sort((a, b) => {
      if (sort === "activity") {
        const aBettors = a.odds.redBettors + a.odds.blueBettors;
        const bBettors = b.odds.redBettors + b.odds.blueBettors;
        if (bBettors !== aBettors) return bBettors - aBettors;
        return b.odds.totalPool - a.odds.totalPool;
      }
      if (sort === "volume") return b.odds.totalPool - a.odds.totalPool;
      const aTime = a.match.scheduled_time ?? "9999";
      const bTime = b.match.scheduled_time ?? "9999";
      return bTime.localeCompare(aTime);
    });
  }

  // Build unified list for "all" tab
  type UnifiedItem =
    | { kind: "match"; data: EnrichedMatch }
    | { kind: "prediction"; data: PredictionMarket };

  function getUnifiedItems(): UnifiedItem[] {
    const items: UnifiedItem[] = [];
    for (const m of matches) items.push({ kind: "match", data: m });
    for (const p of browsableMarkets) items.push({ kind: "prediction", data: p });

    return items.sort((a, b) => {
      const aActivity =
        a.kind === "match"
          ? a.data.odds.redBettors + a.data.odds.blueBettors
          : getPredStats(a.data.id).bettors;
      const bActivity =
        b.kind === "match"
          ? b.data.odds.redBettors + b.data.odds.blueBettors
          : getPredStats(b.data.id).bettors;
      const aPool =
        a.kind === "match" ? a.data.odds.totalPool : getPredStats(a.data.id).pool;
      const bPool =
        b.kind === "match" ? b.data.odds.totalPool : getPredStats(b.data.id).pool;

      if (sort === "activity") {
        if (bActivity !== aActivity) return bActivity - aActivity;
        return bPool - aPool;
      }
      if (sort === "volume") return bPool - aPool;
      const aTime =
        a.kind === "match"
          ? a.data.match.scheduled_time ?? a.data.match.fetched_at
          : a.data.created_at;
      const bTime =
        b.kind === "match"
          ? b.data.match.scheduled_time ?? b.data.match.fetched_at
          : b.data.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }

  const selectedOdds = slipMatch
    ? calculateOdds(pools[slipMatch.match_key] ?? null, null)
    : null;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[16px] font-semibold text-[#e6edf3]">All markets</h2>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors border flex items-center gap-1.5",
              tab === t.key
                ? "border-[#30363d] bg-[#21262d] text-[#e6edf3]"
                : "border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#30363d]"
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className="rounded-md bg-[#30363d] px-1 py-0.5 text-[10px] font-medium text-[#7d8590] leading-none">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[12px] text-[#7d8590] font-medium">Sort by:</span>
        {sorts.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors border",
              sort === s.key
                ? "border-[#388bfd]/50 bg-[#388bfd]/10 text-[#58a6ff]"
                : "border-[#21262d] bg-[#161b22] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#30363d]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {tab === "all" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {getUnifiedItems().map((item) =>
            item.kind === "match" ? (
              <MarketCard
                key={item.data.match.match_key}
                item={item.data}
                onBetRed={() => openSlip(item.data.match, "red")}
                onBetBlue={() => openSlip(item.data.match, "blue")}
              />
            ) : (
              <PredictionMarketCard
                key={item.data.id}
                market={item.data}
                pools={predictionPools[item.data.id] ?? {}}
                balance={balance}
              />
            )
          )}
          {matches.length === 0 && browsableMarkets.length === 0 && <EmptyState />}
        </div>
      )}

      {tab === "matches" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortMatches(matches).map((item) => (
            <MarketCard
              key={item.match.match_key}
              item={item}
              onBetRed={() => openSlip(item.match, "red")}
              onBetBlue={() => openSlip(item.match, "blue")}
            />
          ))}
          {matches.length === 0 && <EmptyState />}
        </div>
      )}

      {tab === "events" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortPredMarkets(eventWinnerMarkets).map((m) => (
            <PredictionMarketCard
              key={m.id}
              market={m}
              pools={predictionPools[m.id] ?? {}}
              balance={balance}
            />
          ))}
          {eventWinnerMarkets.length === 0 && <EmptyState />}
        </div>
      )}

      {tab === "rankings" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortPredMarkets(rankingMarkets).map((m) => (
            <PredictionMarketCard
              key={m.id}
              market={m}
              pools={predictionPools[m.id] ?? {}}
              balance={balance}
            />
          ))}
          {rankingMarkets.length === 0 && <EmptyState />}
        </div>
      )}

      {tab === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortPredMarkets(customMarkets).map((m) => (
            <PredictionMarketCard
              key={m.id}
              market={m}
              pools={predictionPools[m.id] ?? {}}
              balance={balance}
            />
          ))}
          {customMarkets.length === 0 && <EmptyState />}
        </div>
      )}

      {/* Recently resolved — filtered by tab */}
      {(() => {
        const resolvedEventWinners = resolvedPredictionMarkets.filter((m) => m.type === "event_winner");
        const resolvedRankings = resolvedPredictionMarkets.filter(
          (m) => m.type === "ranking_top1" || m.type === "ranking_top8" || m.type === "ranking_position"
        );
        const resolvedCustom = resolvedPredictionMarkets.filter((m) => m.is_custom);

        if (tab === "matches" || tab === "all") {
          if (completed.length === 0) return null;
          // Sort by most recent first
          const sorted = [...completed].sort((a, b) => {
            const aTime = a.match.actual_time ?? a.match.scheduled_time ?? "";
            const bTime = b.match.actual_time ?? b.match.scheduled_time ?? "";
            return bTime.localeCompare(aTime);
          });
          return (
            <div className="mt-8">
              <h2 className="text-[16px] font-semibold text-[#e6edf3] mb-3">
                Recently resolved
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.slice(0, 6).map((item) => (
                  <MarketCard key={item.match.match_key} item={item} />
                ))}
              </div>
            </div>
          );
        }

        const resolvedList =
          tab === "events" ? resolvedEventWinners :
          tab === "rankings" ? resolvedRankings :
          tab === "custom" ? resolvedCustom : [];

        if (resolvedList.length === 0) return null;
        return (
          <div className="mt-8">
            <h2 className="text-[16px] font-semibold text-[#e6edf3] mb-3">
              Recently resolved
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {resolvedList.slice(0, 6).map((m) => (
                <PredictionMarketCard
                  key={m.id}
                  market={m}
                  pools={predictionPools[m.id] ?? {}}
                  balance={balance}
                />
              ))}
            </div>
          </div>
        );
      })()}

      <BetSlip
        match={slipMatch}
        side={slipSide}
        odds={selectedOdds}
        balance={balance}
        open={slipOpen}
        onOpenChange={setSlipOpen}
      />
    </>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <p className="text-[14px] text-[#7d8590]">No markets found</p>
      <p className="text-[12px] text-[#484f58] mt-1">Waiting for events to start</p>
    </div>
  );
}
