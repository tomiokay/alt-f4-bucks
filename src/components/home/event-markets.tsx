"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PredictionMarketCard } from "@/components/prediction-market-card";
import type { PredictionMarket, PredictionPoolOption } from "@/lib/types";

type Props = {
  markets: PredictionMarket[];
  pools: Record<string, Record<string, PredictionPoolOption>>;
  balance: number;
};

type FilterKey = "all" | "event_winner" | "ranking";

export function EventMarkets({ markets, pools, balance }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");

  if (markets.length === 0) return null;

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "event_winner", label: "Event Winners" },
    { key: "ranking", label: "Rankings" },
  ];

  const filtered = markets.filter((m) => {
    if (filter === "all") return true;
    if (filter === "event_winner") return m.type === "event_winner";
    if (filter === "ranking")
      return m.type === "ranking_top1" || m.type === "ranking_top8" || m.type === "ranking_position";
    return true;
  });

  // Sort by total pool descending
  const sorted = [...filtered].sort((a, b) => {
    const aPool = Object.values(pools[a.id] ?? {}).reduce((s, p) => s + p.pool, 0);
    const bPool = Object.values(pools[b.id] ?? {}).reduce((s, p) => s + p.pool, 0);
    return bPool - aPool;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-semibold text-[#e6edf3]">Event markets</h2>
        <Link
          href="/trending?tab=events"
          className="text-[12px] text-[#388bfd] hover:text-[#58a6ff] transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 pb-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors border",
              filter === f.key
                ? "border-[#30363d] bg-[#21262d] text-[#e6edf3]"
                : "border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#30363d]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.slice(0, 6).map((market) => (
          <PredictionMarketCard
            key={market.id}
            market={market}
            pools={pools[market.id] ?? {}}
            balance={balance}
          />
        ))}
      </div>

      {sorted.length > 6 && (
        <div className="mt-3 text-center">
          <Link
            href="/trending?tab=events"
            className="text-[13px] text-[#388bfd] hover:text-[#58a6ff] transition-colors"
          >
            See {sorted.length - 6} more →
          </Link>
        </div>
      )}
    </div>
  );
}
