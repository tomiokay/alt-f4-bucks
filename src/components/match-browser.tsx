"use client";

import { useState } from "react";
import { MatchCard } from "@/components/match-card";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import { cn } from "@/lib/utils";
import type { MatchCache, PoolSummary } from "@/lib/types";

type Props = {
  matches: MatchCache[];
  pools: Record<string, PoolSummary>;
  predictions: Record<string, { redWinProb: number; blueWinProb: number }>;
  balance: number;
};

export function MatchBrowser({ matches, pools, predictions, balance }: Props) {
  const [selectedMatch, setSelectedMatch] = useState<MatchCache | null>(null);
  const [selectedSide, setSelectedSide] = useState<"red" | "blue" | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");

  const now = new Date().toISOString();
  const upcoming = matches.filter((m) =>
    !m.is_complete && (!m.scheduled_time || m.scheduled_time > now)
  );
  const completed = matches.filter((m) =>
    m.is_complete || (m.scheduled_time && m.scheduled_time < now)
  );

  function openSlip(match: MatchCache, side: "red" | "blue") {
    setSelectedMatch(match);
    setSelectedSide(side);
    setSlipOpen(true);
  }

  const selectedOdds =
    selectedMatch
      ? calculateOdds(
          pools[selectedMatch.match_key] ?? null,
          predictions[selectedMatch.match_key] ?? null
        )
      : null;

  const current = tab === "upcoming" ? upcoming : completed;

  return (
    <>
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[#21262d] mb-4">
        <button
          onClick={() => setTab("upcoming")}
          className={cn(
            "pb-2 text-[13px] font-medium transition-colors border-b-2",
            tab === "upcoming"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#7d8590] border-transparent hover:text-[#e6edf3]"
          )}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab("completed")}
          className={cn(
            "pb-2 text-[13px] font-medium transition-colors border-b-2",
            tab === "completed"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#7d8590] border-transparent hover:text-[#e6edf3]"
          )}
        >
          Results
        </button>
      </div>

      {current.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[14px] text-[#7d8590]">
            {tab === "upcoming" ? "No upcoming matches" : "No results yet"}
          </p>
          {tab === "upcoming" && (
            <p className="text-[12px] text-[#484f58] mt-1">
              Sync an event to get started
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((m) => {
            const odds = calculateOdds(
              pools[m.match_key] ?? null,
              predictions[m.match_key] ?? null
            );
            return (
              <MatchCard
                key={m.match_key}
                match={m}
                odds={odds}
                onBetRed={tab === "upcoming" ? () => openSlip(m, "red") : undefined}
                onBetBlue={tab === "upcoming" ? () => openSlip(m, "blue") : undefined}
              />
            );
          })}
        </div>
      )}

      <BetSlip
        match={selectedMatch}
        side={selectedSide}
        odds={selectedOdds}
        balance={balance}
        open={slipOpen}
        onOpenChange={setSlipOpen}
      />
    </>
  );
}
