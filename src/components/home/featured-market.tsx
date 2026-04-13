"use client";

import { useState } from "react";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import { FeaturedChart } from "./featured-chart";
import type { EnrichedMatch } from "@/app/page";
import type { PoolSummary } from "@/lib/types";

type Props = {
  featured: EnrichedMatch;
  pools: Record<string, PoolSummary>;
  predictions: Record<string, { redWinProb: number; blueWinProb: number }>;
  balance: number;
};

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

export function FeaturedMarket({ featured, pools, predictions, balance }: Props) {
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipSide, setSlipSide] = useState<"red" | "blue">("red");

  const { match, odds } = featured;
  const compLabel = COMP_LABELS[match.comp_level] ?? match.comp_level;

  function openSlip(side: "red" | "blue") {
    setSlipSide(side);
    setSlipOpen(true);
  }

  const selectedOdds = calculateOdds(
    pools[match.match_key] ?? null,
    predictions[match.match_key] ?? null
  );

  return (
    <>
      <div className="rounded-xl bg-[#161b22] overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 text-[11px] text-[#7d8590] mb-2">
            <span className="rounded bg-[#21262d] px-1.5 py-0.5 font-medium">
              {match.event_name}
            </span>
            <span>·</span>
            <span>{compLabel} {match.match_number}</span>
          </div>
          <h2 className="text-[18px] font-semibold text-[#e6edf3] leading-tight">
            Who wins {compLabel} {match.match_number}?
          </h2>
        </div>

        {/* Chart area */}
        <div className="px-5 pb-2">
          <FeaturedChart redPct={odds.redPct} bluePct={odds.bluePct} />
        </div>

        {/* Alliance rows */}
        <div className="px-5 pb-4 space-y-2">
          {/* Red alliance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              <span className="text-[14px] text-[#e6edf3] font-mono">
                {match.red_teams.join(" · ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-12 text-right">
                {odds.redPct}%
              </span>
              <button
                onClick={() => openSlip("red")}
                className="rounded-md bg-[#16332a] px-3 py-1.5 text-[12px] font-semibold text-[#22c55e] hover:bg-[#1a3f32] transition-colors"
              >
                Yes {odds.redPct}¢
              </button>
              <button
                onClick={() => openSlip("blue")}
                className="rounded-md bg-[#3b1c1c] px-3 py-1.5 text-[12px] font-semibold text-[#ef4444] hover:bg-[#4a2222] transition-colors"
              >
                No {odds.bluePct}¢
              </button>
            </div>
          </div>

          {/* Blue alliance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
              <span className="text-[14px] text-[#e6edf3] font-mono">
                {match.blue_teams.join(" · ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-12 text-right">
                {odds.bluePct}%
              </span>
              <button
                onClick={() => openSlip("blue")}
                className="rounded-md bg-[#16332a] px-3 py-1.5 text-[12px] font-semibold text-[#22c55e] hover:bg-[#1a3f32] transition-colors"
              >
                Yes {odds.bluePct}¢
              </button>
              <button
                onClick={() => openSlip("red")}
                className="rounded-md bg-[#3b1c1c] px-3 py-1.5 text-[12px] font-semibold text-[#ef4444] hover:bg-[#4a2222] transition-colors"
              >
                No {odds.redPct}¢
              </button>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-4 border-t border-[#21262d] px-5 py-2.5 text-[11px] text-[#484f58]">
          {odds.totalPool > 0 && (
            <span>${odds.totalPool.toLocaleString()} Vol.</span>
          )}
          {(odds.redBettors + odds.blueBettors) > 0 && (
            <span>{odds.redBettors + odds.blueBettors} traders</span>
          )}
          {odds.statboticsRedPct !== null && (
            <span>Statbotics: {odds.statboticsRedPct}/{odds.statboticsBluePct}</span>
          )}
        </div>
      </div>

      <BetSlip
        match={match}
        side={slipSide}
        odds={selectedOdds}
        balance={balance}
        open={slipOpen}
        onOpenChange={setSlipOpen}
      />
    </>
  );
}
