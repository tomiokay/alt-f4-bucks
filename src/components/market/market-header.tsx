"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { MatchCache, MatchOdds } from "@/lib/types";

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

type Props = {
  match: MatchCache;
  odds: MatchOdds;
};

export function MarketHeader({ match, odds }: Props) {
  const comp = COMP_LABELS[match.comp_level] ?? match.comp_level;
  const scheduledDate = match.scheduled_time
    ? new Date(match.scheduled_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[12px] text-[#7d8590] hover:text-[#e6edf3] transition-colors mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to markets
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-[#21262d] px-2 py-0.5 text-[11px] font-medium text-[#7d8590]">
              {match.event_name}
            </span>
            {(() => {
              const scheduled = match.scheduled_time ? new Date(match.scheduled_time) : null;
              const now = new Date();
              const isPast = scheduled && scheduled < now;
              if (match.is_complete) {
                return (
                  <span className="rounded bg-[#16332a] px-2 py-0.5 text-[10px] font-semibold text-[#22c55e]">
                    Resolved
                  </span>
                );
              }
              if (isPast) {
                return (
                  <span className="rounded bg-[#3b1c1c] px-2 py-0.5 text-[10px] font-semibold text-[#7d8590]">
                    Closed
                  </span>
                );
              }
              return (
                <span className="rounded bg-[#1c2128] px-2 py-0.5 text-[10px] font-semibold text-[#388bfd]">
                  Open
                </span>
              );
            })()}
          </div>
          <h1 className="text-[20px] font-semibold text-[#e6edf3] leading-tight">
            Who wins {comp} {match.match_number}?
          </h1>
          {scheduledDate && (
            <p className="text-[12px] text-[#484f58] mt-1">{scheduledDate}</p>
          )}
        </div>

        {/* Volume / traders */}
        <div className="text-right shrink-0">
          {odds.totalPool > 0 && (
            <div className="text-[14px] font-semibold text-[#e6edf3] tabular-nums font-mono">
              ${odds.totalPool.toLocaleString()}
            </div>
          )}
          <div className="text-[11px] text-[#484f58]">
            {odds.totalPool > 0 ? "Volume" : "No bets yet"}
          </div>
        </div>
      </div>

      {/* Alliance probability bars */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] shrink-0" />
          <span className="text-[13px] text-[#e6edf3] font-mono w-[140px] truncate">
            {match.red_teams.join(", ")}
          </span>
          <div className="flex-1 h-6 rounded-md bg-[#21262d] overflow-hidden">
            <div
              className="h-full bg-[#ef4444]/30 rounded-md flex items-center px-2 transition-all duration-500"
              style={{ width: `${odds.redPct}%` }}
            >
              <span className="text-[11px] font-semibold text-[#ef4444] tabular-nums">
                {odds.redPct}%
              </span>
            </div>
          </div>
          {match.is_complete && (
            <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-10 text-right">
              {match.red_score}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6] shrink-0" />
          <span className="text-[13px] text-[#e6edf3] font-mono w-[140px] truncate">
            {match.blue_teams.join(", ")}
          </span>
          <div className="flex-1 h-6 rounded-md bg-[#21262d] overflow-hidden">
            <div
              className="h-full bg-[#3b82f6]/30 rounded-md flex items-center px-2 transition-all duration-500"
              style={{ width: `${odds.bluePct}%` }}
            >
              <span className="text-[11px] font-semibold text-[#3b82f6] tabular-nums">
                {odds.bluePct}%
              </span>
            </div>
          </div>
          {match.is_complete && (
            <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums w-10 text-right">
              {match.blue_score}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
