"use client";

import Link from "next/link";
import type { MatchCache, MatchOdds } from "@/lib/types";

type Props = {
  match: MatchCache;
  odds: MatchOdds;
  onBetRed?: () => void;
  onBetBlue?: () => void;
  compact?: boolean;
};

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

function Stop({ onClick, className, children }: { onClick?: () => void; className: string; children: React.ReactNode }) {
  return (
    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }} className={className}>
      {children}
    </button>
  );
}

export function MatchCard({ match, odds, onBetRed, onBetBlue, compact }: Props) {
  const compLabel = COMP_LABELS[match.comp_level] ?? match.comp_level;
  const isBettable = !match.is_complete;

  return (
    <Link
      href={`/market/${encodeURIComponent(match.match_key)}`}
      className="block rounded-xl bg-[#161b22] p-4 hover:bg-[#1c2128] transition-colors"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#21262d] text-[10px] font-bold text-[#7d8590]">
          {compLabel}
        </div>
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium text-[#e6edf3] leading-tight">
            {compLabel} {match.match_number}
            {match.is_complete && <span className="ml-2 text-[11px] text-[#7d8590]">Final</span>}
          </h3>
          <p className="text-[11px] text-[#7d8590] truncate mt-0.5">{match.event_name}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* Red */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="h-2 w-2 rounded-full bg-[#ef4444] shrink-0" />
            <span className="text-[13px] text-[#e6edf3] truncate font-mono">{match.red_teams.join(", ")}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {match.is_complete ? (
              <>
                <span className="text-[13px] font-medium text-[#e6edf3] tabular-nums">{match.red_score}</span>
                {match.winning_alliance === "red" && <span className="rounded-md bg-[#16332a] px-2 py-0.5 text-[10px] font-semibold text-[#22c55e]">Won</span>}
              </>
            ) : isBettable && onBetRed ? (
              <Stop onClick={onBetRed} className="rounded-md bg-[#ef4444]/15 px-3 py-1 text-[12px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/25 transition-colors tabular-nums">
                {odds.redPct}¢
              </Stop>
            ) : (
              <span className="text-[13px] text-[#e6edf3] tabular-nums">{odds.redPct}%</span>
            )}
          </div>
        </div>

        {/* Blue */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="h-2 w-2 rounded-full bg-[#3b82f6] shrink-0" />
            <span className="text-[13px] text-[#e6edf3] truncate font-mono">{match.blue_teams.join(", ")}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {match.is_complete ? (
              <>
                <span className="text-[13px] font-medium text-[#e6edf3] tabular-nums">{match.blue_score}</span>
                {match.winning_alliance === "blue" && <span className="rounded-md bg-[#16332a] px-2 py-0.5 text-[10px] font-semibold text-[#22c55e]">Won</span>}
              </>
            ) : isBettable && onBetBlue ? (
              <Stop onClick={onBetBlue} className="rounded-md bg-[#3b82f6]/15 px-3 py-1 text-[12px] font-semibold text-[#3b82f6] hover:bg-[#3b82f6]/25 transition-colors tabular-nums">
                {odds.bluePct}¢
              </Stop>
            ) : (
              <span className="text-[13px] text-[#e6edf3] tabular-nums">{odds.bluePct}%</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[#484f58]">
        <span>{odds.totalPool > 0 ? `$${odds.totalPool.toLocaleString()} Vol.` : ""}</span>
        <div className="flex items-center gap-2">
          {odds.statboticsRedPct !== null && !compact && (
            <span className="tabular-nums">Statbotics {odds.statboticsRedPct}/{odds.statboticsBluePct}</span>
          )}
          {(odds.redBettors + odds.blueBettors) > 0 && (
            <span>{odds.redBettors + odds.blueBettors} bettors</span>
          )}
        </div>
      </div>
    </Link>
  );
}
