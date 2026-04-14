"use client";

import { useState } from "react";
import { MatchCard } from "@/components/match-card";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import type { MatchCache, MatchOdds, PoolSummary } from "@/lib/types";

type RankedMatch = {
  match: MatchCache;
  odds: MatchOdds;
  pool: PoolSummary | null;
};

type Props = {
  trending: RankedMatch[];
  recentResults: RankedMatch[];
  pools: Record<string, PoolSummary>;
  predictions: Record<string, { redWinProb: number; blueWinProb: number }>;
  balance: number;
};

export function PopularMarkets({
  trending,
  recentResults,
  pools,
  predictions,
  balance,
}: Props) {
  const [selectedMatch, setSelectedMatch] = useState<MatchCache | null>(null);
  const [selectedSide, setSelectedSide] = useState<"red" | "blue" | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);

  function openSlip(match: MatchCache, side: "red" | "blue") {
    setSelectedMatch(match);
    setSelectedSide(side);
    setSlipOpen(true);
  }

  const selectedOdds = selectedMatch
    ? calculateOdds(
        pools[selectedMatch.match_key] ?? null,
        predictions[selectedMatch.match_key] ?? null
      )
    : null;

  const hotMatches = trending.filter((r) => r.odds.totalPool > 0);
  const contestedMatches = trending.filter(
    (r) => Math.abs(r.odds.redPct - 50) <= 15
  );
  const newMarkets = trending.filter((r) => r.odds.totalPool === 0);

  return (
    <>
      <div className="space-y-8">
        {hotMatches.length > 0 && (
          <Section title="Highest Volume" count={hotMatches.length}>
            {hotMatches.slice(0, 6).map((r) => (
              <MatchCard
                key={r.match.match_key}
                match={r.match}
                odds={r.odds}
                onBetRed={() => openSlip(r.match, "red")}
                onBetBlue={() => openSlip(r.match, "blue")}
                compact
              />
            ))}
          </Section>
        )}

        {contestedMatches.length > 0 && (
          <Section title="Most Contested" count={contestedMatches.length}>
            {contestedMatches.slice(0, 6).map((r) => (
              <MatchCard
                key={r.match.match_key}
                match={r.match}
                odds={r.odds}
                onBetRed={() => openSlip(r.match, "red")}
                onBetBlue={() => openSlip(r.match, "blue")}
                compact
              />
            ))}
          </Section>
        )}

        {newMarkets.length > 0 && (
          <Section title="New Markets" count={newMarkets.length}>
            {newMarkets.slice(0, 6).map((r) => (
              <MatchCard
                key={r.match.match_key}
                match={r.match}
                odds={r.odds}
                onBetRed={() => openSlip(r.match, "red")}
                onBetBlue={() => openSlip(r.match, "blue")}
                compact
              />
            ))}
          </Section>
        )}

        {recentResults.length > 0 && (
          <Section title="Recent Results" count={recentResults.length}>
            {recentResults.map((r) => (
              <MatchCard
                key={r.match.match_key}
                match={r.match}
                odds={r.odds}
                compact
              />
            ))}
          </Section>
        )}

        {trending.length === 0 && recentResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] text-[#7d8590]">No markets yet</p>
            <p className="text-[12px] text-[#484f58] mt-1">
              Waiting for an event to start
            </p>
          </div>
        )}
      </div>

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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[14px] font-medium text-[#e6edf3]">{title}</h2>
        <span className="rounded-md bg-[#21262d] px-1.5 py-0.5 text-[10px] font-medium text-[#7d8590]">
          {count}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}
