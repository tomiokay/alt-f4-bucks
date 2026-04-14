"use client";

import Link from "next/link";
import type { MatchCache, MatchOdds } from "@/lib/types";

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

type Props = {
  markets: { match: MatchCache; odds: MatchOdds }[];
};

export function RelatedMarkets({ markets }: Props) {
  if (markets.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
      <h3 className="text-[13px] font-semibold text-[#e6edf3] mb-3">Related markets</h3>
      <div className="space-y-2">
        {markets.map(({ match, odds }) => {
          const comp = COMP_LABELS[match.comp_level] ?? match.comp_level;
          return (
            <Link
              key={match.match_key}
              href={`/market/${encodeURIComponent(match.match_key)}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[#1c2128] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[12px] text-[#e6edf3] font-medium truncate">
                  {comp} {match.match_number}
                </p>
                <p className="text-[10px] text-[#484f58]">
                  {match.event_name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-[#ef4444] tabular-nums">{odds.redPct}%</span>
                <span className="text-[10px] text-[#484f58]">/</span>
                <span className="text-[11px] text-[#3b82f6] tabular-nums">{odds.bluePct}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
