"use client";

import type { EnrichedMatch } from "@/app/page";

type Props = {
  items: EnrichedMatch[];
};

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

export function BreakingNews({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-[#e6edf3]">
          Breaking news
        </h3>
        <span className="text-[11px] text-[#7d8590]">Latest</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => {
          const { match } = item;
          const comp = COMP_LABELS[match.comp_level] ?? match.comp_level;
          const winner = match.winning_alliance;
          const winnerTeams = winner === "red" ? match.red_teams : match.blue_teams;
          const winScore = winner === "red" ? match.red_score : match.blue_score;
          const loseScore = winner === "red" ? match.blue_score : match.red_score;

          return (
            <div
              key={match.match_key}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-[12px] text-[#484f58] tabular-nums mt-0.5 shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-[#e6edf3] leading-snug">
                    {winnerTeams.join(", ")} win {comp} {match.match_number}
                  </p>
                  <p className="text-[11px] text-[#484f58] mt-0.5">
                    {match.event_name}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`text-[14px] font-semibold tabular-nums ${
                    winner === "red" ? "text-[#ef4444]" : "text-[#3b82f6]"
                  }`}
                >
                  {winScore}–{loseScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
