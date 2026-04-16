"use client";

import Link from "next/link";
import type { EnrichedMatch } from "@/app/page";

type Props = {
  items: EnrichedMatch[];
  allCompleted: EnrichedMatch[];
};

const COMP_LABELS: Record<string, string> = {
  qm: "Qual",
  sf: "Semi",
  f: "Final",
};

type Highlight = {
  match: EnrichedMatch;
  tag: string;
  tagColor: string;
  detail: string;
};

function buildHighlights(allCompleted: EnrichedMatch[]): Highlight[] {
  const highlights: Highlight[] = [];

  // Finals
  const finals = allCompleted.filter((e) => e.match.comp_level === "f");
  for (const f of finals) {
    const winner = f.match.winning_alliance;
    const teams = winner === "red" ? f.match.red_teams : f.match.blue_teams;
    highlights.push({
      match: f,
      tag: "FINAL",
      tagColor: "bg-[#f59e0b]/20 text-[#f59e0b]",
      detail: `${teams.join(", ")} win — ${f.match.red_score}–${f.match.blue_score}`,
    });
  }

  // Semis
  const semis = allCompleted.filter((e) => e.match.comp_level === "sf");
  for (const s of semis.slice(0, 5)) {
    const winner = s.match.winning_alliance;
    const teams = winner === "red" ? s.match.red_teams : s.match.blue_teams;
    highlights.push({
      match: s,
      tag: "SEMI",
      tagColor: "bg-[#a855f7]/20 text-[#a855f7]",
      detail: `${teams.join(", ")} win — ${s.match.red_score}–${s.match.blue_score}`,
    });
  }

  // High scores (top 10 by combined score)
  const highScores = [...allCompleted]
    .filter((e) => e.match.red_score !== null && e.match.blue_score !== null)
    .sort((a, b) => {
      const aTotal = (a.match.red_score ?? 0) + (a.match.blue_score ?? 0);
      const bTotal = (b.match.red_score ?? 0) + (b.match.blue_score ?? 0);
      return bTotal - aTotal;
    })
    .slice(0, 5);

  for (const h of highScores) {
    const total = (h.match.red_score ?? 0) + (h.match.blue_score ?? 0);
    const comp = COMP_LABELS[h.match.comp_level] ?? h.match.comp_level;
    highlights.push({
      match: h,
      tag: "HIGH SCORE",
      tagColor: "bg-[#22c55e]/20 text-[#22c55e]",
      detail: `${comp} ${h.match.match_number} — ${h.match.red_score}–${h.match.blue_score} (${total} total)`,
    });
  }

  // High auto scores
  const highAuto = [...allCompleted]
    .filter((e) => e.match.red_auto_points !== null || e.match.blue_auto_points !== null)
    .sort((a, b) => {
      const aMax = Math.max(a.match.red_auto_points ?? 0, a.match.blue_auto_points ?? 0);
      const bMax = Math.max(b.match.red_auto_points ?? 0, b.match.blue_auto_points ?? 0);
      return bMax - aMax;
    })
    .slice(0, 5);

  for (const h of highAuto) {
    const redAuto = h.match.red_auto_points ?? 0;
    const blueAuto = h.match.blue_auto_points ?? 0;
    const best = Math.max(redAuto, blueAuto);
    const side = redAuto >= blueAuto ? "Red" : "Blue";
    const teams = redAuto >= blueAuto ? h.match.red_teams : h.match.blue_teams;
    const comp = COMP_LABELS[h.match.comp_level] ?? h.match.comp_level;
    highlights.push({
      match: h,
      tag: "AUTO",
      tagColor: "bg-[#3b82f6]/20 text-[#3b82f6]",
      detail: `${teams.join(", ")} scored ${best} auto pts — ${comp} ${h.match.match_number}`,
    });
  }

  // 6 RP matches (max RPs in a match)
  const sixRp = allCompleted.filter((e) => {
    const redRp = e.match.red_rp ?? 0;
    const blueRp = e.match.blue_rp ?? 0;
    return redRp >= 6 || blueRp >= 6;
  });

  for (const h of sixRp.slice(0, 5)) {
    const redRp = h.match.red_rp ?? 0;
    const blueRp = h.match.blue_rp ?? 0;
    const best = Math.max(redRp, blueRp);
    const teams = redRp >= blueRp ? h.match.red_teams : h.match.blue_teams;
    const comp = COMP_LABELS[h.match.comp_level] ?? h.match.comp_level;
    highlights.push({
      match: h,
      tag: `${best} RP`,
      tagColor: "bg-[#ec4899]/20 text-[#ec4899]",
      detail: `${teams.join(", ")} — ${comp} ${h.match.match_number}`,
    });
  }

  // Deduplicate by match key, keep first occurrence (priority order above)
  const seen = new Set<string>();
  const deduped = highlights.filter((h) => {
    const key = `${h.match.match.match_key}:${h.tag}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by most recent first
  return deduped.sort((a, b) => {
    const aTime = a.match.match.actual_time ?? a.match.match.scheduled_time ?? "";
    const bTime = b.match.match.actual_time ?? b.match.match.scheduled_time ?? "";
    return bTime.localeCompare(aTime);
  });
}

export function BreakingNews({ items, allCompleted }: Props) {
  const highlights = buildHighlights(allCompleted);

  if (highlights.length === 0 && items.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#161b22] overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="text-[13px] font-semibold text-[#e6edf3]">Breaking news</h3>
        <span className="text-[11px] text-[#7d8590]">Latest</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto px-4 pb-3 space-y-2.5">
        {highlights.map((h, i) => (
          <Link
            key={`${h.match.match.match_key}-${h.tag}-${i}`}
            href={`/market/${encodeURIComponent(h.match.match.match_key)}`}
            className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-[#1c2128] transition-colors"
          >
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${h.tagColor}`}>
              {h.tag}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-[#e6edf3] leading-snug">{h.detail}</p>
              <p className="text-[10px] text-[#484f58] mt-0.5">{h.match.match.event_name}</p>
            </div>
          </Link>
        ))}

        {highlights.length === 0 && items.map((item, i) => {
          const { match } = item;
          const comp = COMP_LABELS[match.comp_level] ?? match.comp_level;
          const winner = match.winning_alliance;
          const winnerTeams = winner === "red" ? match.red_teams : match.blue_teams;

          return (
            <Link
              key={match.match_key}
              href={`/market/${encodeURIComponent(match.match_key)}`}
              className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-[#1c2128] transition-colors"
            >
              <span className="text-[12px] text-[#484f58] tabular-nums mt-0.5 shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] text-[#e6edf3] leading-snug">
                  {winnerTeams.join(", ")} win {comp} {match.match_number}
                </p>
                <p className="text-[10px] text-[#484f58] mt-0.5">{match.event_name}</p>
              </div>
              <span className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                winner === "red" ? "text-[#ef4444]" : "text-[#3b82f6]"
              }`}>
                {match.red_score}–{match.blue_score}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
