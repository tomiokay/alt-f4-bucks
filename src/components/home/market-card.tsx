"use client";

import Link from "next/link";
import type { EnrichedMatch } from "@/app/page";

type Props = {
  item: EnrichedMatch;
  onBetRed?: () => void;
  onBetBlue?: () => void;
};

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

function StopPropButton({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={className}
    >
      {children}
    </button>
  );
}

export function MarketCard({ item, onBetRed, onBetBlue }: Props) {
  const { match, odds } = item;
  const compLabel = COMP_LABELS[match.comp_level] ?? match.comp_level;

  return (
    <Link
      href={`/market/${encodeURIComponent(match.match_key)}`}
      className="block rounded-xl bg-[#161b22] p-4 hover:bg-[#1c2128] transition-colors"
    >
      {/* Title */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-[#484f58]">{match.event_name}</span>
        </div>
        <h3 className="text-[14px] font-medium text-[#e6edf3] leading-snug">
          {compLabel} {match.match_number}
          {match.is_complete && (
            <span className="ml-2 text-[11px] text-[#7d8590] font-normal">Resolved</span>
          )}
        </h3>
      </div>

      {/* Alliance rows */}
      <div className="space-y-2">
        {/* Red */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="h-2 w-2 rounded-full bg-[#ef4444] shrink-0" />
            <span className="text-[12px] text-[#e6edf3] truncate font-mono">
              {match.red_teams.join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {match.is_complete ? (
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[#e6edf3] tabular-nums">
                  {match.red_score}
                </span>
                {match.winning_alliance === "red" && (
                  <span className="rounded bg-[#16332a] px-1.5 py-0.5 text-[10px] font-semibold text-[#22c55e]">
                    Won
                  </span>
                )}
              </div>
            ) : (
              <StopPropButton
                onClick={onBetRed}
                className="rounded-md bg-[#ef4444]/15 px-3 py-1 text-[12px] font-semibold text-[#ef4444] hover:bg-[#ef4444]/25 transition-colors tabular-nums"
              >
                {odds.redPct}¢
              </StopPropButton>
            )}
          </div>
        </div>

        {/* Blue */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="h-2 w-2 rounded-full bg-[#3b82f6] shrink-0" />
            <span className="text-[12px] text-[#e6edf3] truncate font-mono">
              {match.blue_teams.join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {match.is_complete ? (
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[#e6edf3] tabular-nums">
                  {match.blue_score}
                </span>
                {match.winning_alliance === "blue" && (
                  <span className="rounded bg-[#16332a] px-1.5 py-0.5 text-[10px] font-semibold text-[#22c55e]">
                    Won
                  </span>
                )}
              </div>
            ) : (
              <StopPropButton
                onClick={onBetBlue}
                className="rounded-md bg-[#3b82f6]/15 px-3 py-1 text-[12px] font-semibold text-[#3b82f6] hover:bg-[#3b82f6]/25 transition-colors tabular-nums"
              >
                {odds.bluePct}¢
              </StopPropButton>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-[#484f58]">
        {odds.totalPool > 0 && (
          <span>${odds.totalPool.toLocaleString()} Vol.</span>
        )}
        {(odds.redBettors + odds.blueBettors) > 0 && (
          <span>{odds.redBettors + odds.blueBettors} traders</span>
        )}
      </div>
    </Link>
  );
}
