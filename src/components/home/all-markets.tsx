"use client";

import { useState } from "react";
import { MarketCard } from "./market-card";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import { cn } from "@/lib/utils";
import type { EnrichedMatch } from "@/app/page";
import type { MatchCache, PoolSummary } from "@/lib/types";

type Topic = {
  key: string;
  name: string;
  count: number;
  volume: number;
};

type Props = {
  upcoming: EnrichedMatch[];
  trending: EnrichedMatch[];
  completed: EnrichedMatch[];
  pools: Record<string, PoolSummary>;
  predictions: Record<string, { redWinProb: number; blueWinProb: number }>;
  balance: number;
  hotTopics: Topic[];
};

export function AllMarkets({
  upcoming,
  trending,
  completed,
  pools,
  predictions,
  balance,
  hotTopics,
}: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [slipMatch, setSlipMatch] = useState<MatchCache | null>(null);
  const [slipSide, setSlipSide] = useState<"red" | "blue">("red");
  const [slipOpen, setSlipOpen] = useState(false);

  function openSlip(match: MatchCache, side: "red" | "blue") {
    setSlipMatch(match);
    setSlipSide(side);
    setSlipOpen(true);
  }

  // Filter pills
  const compLevels = [
    { key: "all", label: "All" },
    { key: "qm", label: "Quals" },
    { key: "sf", label: "Semis" },
    { key: "f", label: "Finals" },
    ...hotTopics.slice(0, 4).map((t) => ({ key: `event:${t.key}`, label: t.name.replace(/\d{4}\s*/, "").slice(0, 20) })),
  ];

  // Apply filter
  let filtered = upcoming;
  if (filter === "qm" || filter === "sf" || filter === "f") {
    filtered = upcoming.filter((e) => e.match.comp_level === filter);
  } else if (filter.startsWith("event:")) {
    const eventKey = filter.replace("event:", "");
    filtered = upcoming.filter((e) => e.match.event_key === eventKey);
  }

  const selectedOdds = slipMatch
    ? calculateOdds(
        pools[slipMatch.match_key] ?? null,
        predictions[slipMatch.match_key] ?? null
      )
    : null;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-semibold text-[#e6edf3]">All markets</h2>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        {compLevels.map((level) => (
          <button
            key={level.key}
            onClick={() => setFilter(level.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors border",
              filter === level.key
                ? "border-[#30363d] bg-[#21262d] text-[#e6edf3]"
                : "border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#30363d]"
            )}
          >
            {level.label}
          </button>
        ))}
      </div>

      {/* Market grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[14px] text-[#7d8590]">No markets found</p>
          <p className="text-[12px] text-[#484f58] mt-1">
            Waiting for an event to start
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <MarketCard
              key={item.match.match_key}
              item={item}
              onBetRed={() => openSlip(item.match, "red")}
              onBetBlue={() => openSlip(item.match, "blue")}
            />
          ))}
        </div>
      )}

      {/* Recently resolved */}
      {completed.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[16px] font-semibold text-[#e6edf3] mb-3">
            Recently resolved
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {completed.slice(0, 6).map((item) => (
              <MarketCard key={item.match.match_key} item={item} />
            ))}
          </div>
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
    </div>
  );
}
