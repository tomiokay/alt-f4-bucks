"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MatchCard } from "@/components/match-card";
import { PredictionMarketCard } from "@/components/prediction-market-card";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import { cn } from "@/lib/utils";
import type {
  MatchCache,
  MatchOdds,
  PoolSummary,
  PredictionMarket,
  PredictionPoolOption,
} from "@/lib/types";

type EnrichedMatch = {
  match: MatchCache;
  odds: MatchOdds;
  pool: PoolSummary | null;
};

type Props = {
  matches: EnrichedMatch[];
  pools: Record<string, PoolSummary>;
  balance: number;
  predictionMarkets: PredictionMarket[];
  predictionPools: Record<string, Record<string, PredictionPoolOption>>;
};

type TabKey = "all" | "matches" | "events" | "rankings" | "custom";
type SortKey = "activity" | "volume" | "newest";

export function TrendingView({
  matches,
  pools,
  balance,
  predictionMarkets,
  predictionPools,
}: Props) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "all";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [sort, setSort] = useState<SortKey>("activity");
  const [slipMatch, setSlipMatch] = useState<MatchCache | null>(null);
  const [slipSide, setSlipSide] = useState<"red" | "blue">("red");
  const [slipOpen, setSlipOpen] = useState(false);

  function openSlip(match: MatchCache, side: "red" | "blue") {
    setSlipMatch(match);
    setSlipSide(side);
    setSlipOpen(true);
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "matches", label: "Match Markets" },
    { key: "events", label: "Event Winners" },
    { key: "rankings", label: "Rankings" },
    { key: "custom", label: "Custom" },
  ];

  const sorts: { key: SortKey; label: string }[] = [
    { key: "activity", label: "Most Active" },
    { key: "volume", label: "Highest Volume" },
    { key: "newest", label: "Newest" },
  ];

  // Helper: get total pool and bettors for a prediction market
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

  // Filter prediction markets by tab
  const eventWinnerMarkets = predictionMarkets.filter((m) => m.type === "event_winner");
  const rankingMarkets = predictionMarkets.filter(
    (m) => m.type === "ranking_top1" || m.type === "ranking_top8" || m.type === "ranking_position"
  );
  const customMarkets = predictionMarkets.filter((m) => m.is_custom);
  const scoreMarkets = predictionMarkets.filter(
    (m) => m.type === "score_over_under" || m.type === "score_prediction"
  );

  // Sort prediction markets
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

  // Sort matches
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

  const selectedOdds = slipMatch
    ? calculateOdds(pools[slipMatch.match_key] ?? null, null)
    : null;

  // Build unified items for "all" tab
  type UnifiedItem =
    | { kind: "match"; data: EnrichedMatch }
    | { kind: "prediction"; data: PredictionMarket };

  function getUnifiedItems(): UnifiedItem[] {
    const items: UnifiedItem[] = [];
    for (const m of matches) items.push({ kind: "match", data: m });
    for (const p of predictionMarkets) items.push({ kind: "prediction", data: p });

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
      // newest
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

  // Counts for tab badges
  const matchCount = matches.length;
  const eventCount = eventWinnerMarkets.length;
  const rankCount = rankingMarkets.length;
  const customCount = customMarkets.length;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#e6edf3] mb-1">Trending</h1>
        <p className="text-[13px] text-[#7d8590]">
          Markets ranked by what people are betting on most
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        {tabs.map((t) => {
          const count =
            t.key === "all"
              ? matchCount + predictionMarkets.length
              : t.key === "matches"
              ? matchCount
              : t.key === "events"
              ? eventCount
              : t.key === "rankings"
              ? rankCount
              : customCount;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors border flex items-center gap-1.5",
                tab === t.key
                  ? "border-[#30363d] bg-[#21262d] text-[#e6edf3]"
                  : "border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#30363d]"
              )}
            >
              {t.label}
              {count > 0 && (
                <span className="rounded-md bg-[#30363d] px-1.5 py-0.5 text-[10px] font-medium text-[#7d8590]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] text-[#484f58]">Sort:</span>
        {sorts.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "text-[11px] font-medium transition-colors",
              sort === s.key ? "text-[#e6edf3]" : "text-[#484f58] hover:text-[#7d8590]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "all" && (
        <AllTab
          items={getUnifiedItems()}
          pools={pools}
          predictionPools={predictionPools}
          balance={balance}
          onBet={openSlip}
        />
      )}

      {tab === "matches" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortMatches(matches).map((item) => (
            <MatchCard
              key={item.match.match_key}
              match={item.match}
              odds={item.odds}
              onBetRed={() => openSlip(item.match, "red")}
              onBetBlue={() => openSlip(item.match, "blue")}
              compact
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

function AllTab({
  items,
  pools,
  predictionPools,
  balance,
  onBet,
}: {
  items: ({ kind: "match"; data: { match: MatchCache; odds: MatchOdds; pool: PoolSummary | null } } | { kind: "prediction"; data: PredictionMarket })[];
  pools: Record<string, PoolSummary>;
  predictionPools: Record<string, Record<string, PredictionPoolOption>>;
  balance: number;
  onBet: (match: MatchCache, side: "red" | "blue") => void;
}) {
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) =>
        item.kind === "match" ? (
          <MatchCard
            key={item.data.match.match_key}
            match={item.data.match}
            odds={item.data.odds}
            onBetRed={() => onBet(item.data.match, "red")}
            onBetBlue={() => onBet(item.data.match, "blue")}
            compact
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
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <p className="text-[14px] text-[#7d8590]">No markets found</p>
      <p className="text-[12px] text-[#484f58] mt-1">
        Waiting for events to start
      </p>
    </div>
  );
}
