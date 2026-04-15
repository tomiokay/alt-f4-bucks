"use client";

import { useState } from "react";
import { MatchCard } from "@/components/match-card";
import { BetSlip } from "@/components/bet-slip";
import { calculateOdds } from "@/lib/odds";
import { cn } from "@/lib/utils";
import { PredictionMarketCard } from "@/components/prediction-market-card";
import type { MatchCache, PoolSummary, PredictionMarket, PredictionPoolOption } from "@/lib/types";
import type { TBARanking, TBAAlliance } from "@/lib/tba";

type Props = {
  eventKey: string;
  eventName: string;
  matches: MatchCache[];
  pools: Record<string, PoolSummary>;
  balance: number;
  predictions?: Record<string, { redWinProb: number; blueWinProb: number }>;
  rankings?: TBARanking[];
  alliances?: TBAAlliance[];
  predictionMarkets?: PredictionMarket[];
  predictionPools?: Record<string, Record<string, PredictionPoolOption>>;
};

function stripFrc(key: string) {
  return key.replace(/^frc/, "");
}

function compLevelLabel(level: string) {
  switch (level) {
    case "qm": return "Quals";
    case "sf": return "Semis";
    case "f": return "Finals";
    case "qf": return "Quarters";
    case "ef": return "Eighths";
    default: return level.toUpperCase();
  }
}

function compLevelOrder(level: string) {
  switch (level) {
    case "qm": return 0;
    case "ef": return 1;
    case "qf": return 2;
    case "sf": return 3;
    case "f": return 4;
    default: return 5;
  }
}

// ── Matches Tab ──────────────────────────────────────────────

function MatchesTab({
  matches,
  pools,
  predictions,
  balance,
}: {
  matches: MatchCache[];
  pools: Record<string, PoolSummary>;
  predictions: Record<string, { redWinProb: number; blueWinProb: number }>;
  balance: number;
}) {
  const [selectedMatch, setSelectedMatch] = useState<MatchCache | null>(null);
  const [selectedSide, setSelectedSide] = useState<"red" | "blue" | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const [sub, setSub] = useState<"upcoming" | "completed">("upcoming");

  const upcoming = matches
    .filter((m) => !m.is_complete)
    .sort((a, b) => {
      const lo = compLevelOrder(a.comp_level) - compLevelOrder(b.comp_level);
      if (lo !== 0) return lo;
      return a.match_number - b.match_number;
    });
  const completed = matches
    .filter((m) => m.is_complete)
    .sort((a, b) => {
      const lo = compLevelOrder(a.comp_level) - compLevelOrder(b.comp_level);
      if (lo !== 0) return lo;
      return b.match_number - a.match_number;
    });

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

  const current = sub === "upcoming" ? upcoming : completed;

  return (
    <>
      <div className="flex items-center gap-4 border-b border-[#21262d] mb-4">
        <button
          onClick={() => setSub("upcoming")}
          className={cn(
            "pb-2 text-[13px] font-medium transition-colors border-b-2",
            sub === "upcoming"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#7d8590] border-transparent hover:text-[#e6edf3]"
          )}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setSub("completed")}
          className={cn(
            "pb-2 text-[13px] font-medium transition-colors border-b-2",
            sub === "completed"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#7d8590] border-transparent hover:text-[#e6edf3]"
          )}
        >
          Results ({completed.length})
        </button>
      </div>

      {current.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[14px] text-[#7d8590]">
            {sub === "upcoming" ? "No upcoming matches" : "No results yet"}
          </p>
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
                onBetRed={sub === "upcoming" ? () => openSlip(m, "red") : undefined}
                onBetBlue={sub === "upcoming" ? () => openSlip(m, "blue") : undefined}
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

// ── Rankings Tab ──────────────────────────────────────────────

function RankingsTab({ rankings }: { rankings: TBARanking[] }) {
  if (rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] text-[#7d8590]">Rankings not available yet</p>
        <p className="text-[12px] text-[#484f58] mt-1">
          Rankings appear once qualification matches begin
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#21262d]">
            <th className="pb-2 pr-3 text-[11px] font-semibold text-[#7d8590] uppercase tracking-wide w-12">Rank</th>
            <th className="pb-2 pr-3 text-[11px] font-semibold text-[#7d8590] uppercase tracking-wide">Team</th>
            <th className="pb-2 pr-3 text-[11px] font-semibold text-[#7d8590] uppercase tracking-wide text-center">Record</th>
            <th className="pb-2 pr-3 text-[11px] font-semibold text-[#7d8590] uppercase tracking-wide text-center hidden sm:table-cell">Played</th>
            <th className="pb-2 pr-3 text-[11px] font-semibold text-[#7d8590] uppercase tracking-wide text-right hidden sm:table-cell">RP</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r) => {
            const rp = r.sort_orders[0];
            return (
              <tr key={r.team_key} className="border-b border-[#161b22] hover:bg-[#161b22] transition-colors">
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold",
                      r.rank === 1
                        ? "bg-yellow-500/20 text-yellow-400"
                        : r.rank === 2
                        ? "bg-gray-400/20 text-gray-300"
                        : r.rank === 3
                        ? "bg-orange-500/20 text-orange-400"
                        : r.rank <= 8
                        ? "bg-[#21262d] text-[#e6edf3]"
                        : "text-[#7d8590]"
                    )}
                  >
                    {r.rank}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="text-[14px] font-semibold text-[#e6edf3] font-mono">
                    {stripFrc(r.team_key)}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-center">
                  <span className="text-[13px] text-[#e6edf3] font-mono tabular-nums">
                    <span className="text-[#22c55e]">{r.record.wins}</span>
                    <span className="text-[#484f58]">-</span>
                    <span className="text-[#ef4444]">{r.record.losses}</span>
                    {r.record.ties > 0 && (
                      <>
                        <span className="text-[#484f58]">-</span>
                        <span className="text-[#7d8590]">{r.record.ties}</span>
                      </>
                    )}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-center hidden sm:table-cell">
                  <span className="text-[13px] text-[#7d8590] tabular-nums">{r.matches_played}</span>
                </td>
                <td className="py-2.5 pr-3 text-right hidden sm:table-cell">
                  <span className="text-[13px] text-[#e6edf3] font-mono tabular-nums">
                    {rp !== undefined ? rp.toFixed(2) : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Playoffs Tab ──────────────────────────────────────────────

function PlayoffsTab({
  alliances,
  matches,
}: {
  alliances: TBAAlliance[];
  matches: MatchCache[];
}) {
  if (alliances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] text-[#7d8590]">Playoff alliances not selected yet</p>
        <p className="text-[12px] text-[#484f58] mt-1">
          Alliance selection happens after qualification matches
        </p>
      </div>
    );
  }

  // Group playoff matches by comp level
  const playoffMatches = matches
    .filter((m) => m.comp_level !== "qm")
    .sort((a, b) => {
      const lo = compLevelOrder(a.comp_level) - compLevelOrder(b.comp_level);
      if (lo !== 0) return lo;
      return a.match_number - b.match_number;
    });

  const matchesByLevel: Record<string, MatchCache[]> = {};
  for (const m of playoffMatches) {
    const key = m.comp_level;
    if (!matchesByLevel[key]) matchesByLevel[key] = [];
    matchesByLevel[key].push(m);
  }

  const levelOrder = ["ef", "qf", "sf", "f"];

  return (
    <div className="space-y-6">
      {/* Alliance picks */}
      <div>
        <h3 className="text-[13px] font-semibold text-[#7d8590] uppercase tracking-wide mb-3">
          Alliance Selections
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {alliances.map((a, i) => {
            const statusColor =
              a.status?.status === "won"
                ? "border-yellow-500/50 bg-yellow-500/5"
                : a.status?.status === "eliminated"
                ? "border-[#21262d] opacity-60"
                : "border-[#21262d]";

            return (
              <div
                key={a.name}
                className={cn(
                  "rounded-lg border p-3 bg-[#161b22] transition-colors",
                  statusColor
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-[#e6edf3]">
                    {a.name || `Alliance ${i + 1}`}
                  </span>
                  {a.status && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                        a.status.status === "won"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : a.status.status === "eliminated"
                          ? "bg-[#21262d] text-[#484f58]"
                          : "bg-[#22c55e]/20 text-[#22c55e]"
                      )}
                    >
                      {a.status.status === "won"
                        ? "WINNER"
                        : a.status.status === "eliminated"
                        ? "OUT"
                        : "PLAYING"}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {a.picks.map((team, ti) => (
                    <div key={team} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] w-4 text-center",
                          ti === 0 ? "text-yellow-400" : "text-[#484f58]"
                        )}
                      >
                        {ti === 0 ? "C" : ti + 1}
                      </span>
                      <span className="text-[13px] font-mono text-[#e6edf3]">
                        {stripFrc(team)}
                      </span>
                    </div>
                  ))}
                </div>
                {a.status?.record && (
                  <div className="mt-2 pt-2 border-t border-[#21262d]">
                    <span className="text-[11px] text-[#7d8590] font-mono tabular-nums">
                      {a.status.record.wins}W-{a.status.record.losses}L
                      {a.status.record.ties > 0 && `-${a.status.record.ties}T`}
                      {a.status.level && (
                        <span className="text-[#484f58]">
                          {" "}· {compLevelLabel(a.status.level)}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Playoff matches by round */}
      {levelOrder
        .filter((lvl) => matchesByLevel[lvl]?.length)
        .map((lvl) => (
          <div key={lvl}>
            <h3 className="text-[13px] font-semibold text-[#7d8590] uppercase tracking-wide mb-3">
              {compLevelLabel(lvl)}
            </h3>
            <div className="space-y-2">
              {matchesByLevel[lvl].map((m) => (
                <div
                  key={m.match_key}
                  className="rounded-lg bg-[#161b22] p-3 flex items-center gap-4"
                >
                  <span className="text-[11px] text-[#484f58] w-16 shrink-0">
                    {compLevelLabel(m.comp_level)} {m.match_number}
                  </span>

                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    {/* Red alliance */}
                    <div className="text-right">
                      <span
                        className={cn(
                          "text-[13px] font-mono",
                          m.is_complete && m.winning_alliance === "red"
                            ? "text-[#ef4444] font-bold"
                            : "text-[#e6edf3]"
                        )}
                      >
                        {m.red_teams.join(" · ")}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                      {m.is_complete ? (
                        <>
                          <span
                            className={cn(
                              "text-[14px] font-bold font-mono tabular-nums",
                              m.winning_alliance === "red" ? "text-[#ef4444]" : "text-[#7d8590]"
                            )}
                          >
                            {m.red_score}
                          </span>
                          <span className="text-[#484f58] text-[12px]">-</span>
                          <span
                            className={cn(
                              "text-[14px] font-bold font-mono tabular-nums",
                              m.winning_alliance === "blue" ? "text-[#388bfd]" : "text-[#7d8590]"
                            )}
                          >
                            {m.blue_score}
                          </span>
                        </>
                      ) : (
                        <span className="text-[12px] text-[#484f58]">vs</span>
                      )}
                    </div>

                    {/* Blue alliance */}
                    <div>
                      <span
                        className={cn(
                          "text-[13px] font-mono",
                          m.is_complete && m.winning_alliance === "blue"
                            ? "text-[#388bfd] font-bold"
                            : "text-[#e6edf3]"
                        )}
                      >
                        {m.blue_teams.join(" · ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {playoffMatches.length === 0 && alliances.length > 0 && (
        <div className="text-center py-8">
          <p className="text-[13px] text-[#484f58]">
            Playoff matches haven&apos;t started yet
          </p>
        </div>
      )}
    </div>
  );
}

// ── Predictions Tab ──────────────────────────────────────────

function PredictionsTab({
  markets,
  pools,
  balance,
}: {
  markets: PredictionMarket[];
  pools: Record<string, Record<string, PredictionPoolOption>>;
  balance: number;
}) {
  const [filter, setFilter] = useState<"all" | "score" | "event" | "ranking">("all");

  const filtered = markets.filter((m) => {
    if (filter === "score") return m.type === "score_over_under" || m.type === "score_prediction";
    if (filter === "event") return m.type === "event_winner";
    if (filter === "ranking") return m.type === "ranking_top1" || m.type === "ranking_top8" || m.type === "ranking_position";
    return true;
  });

  const openMarkets = filtered.filter((m) => m.status === "open");
  const resolvedMarkets = filtered.filter((m) => m.status !== "open");

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] text-[#7d8590]">No prediction markets yet</p>
        <p className="text-[12px] text-[#484f58] mt-1">
          Markets are created automatically as match data arrives
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex items-center gap-1 rounded-lg bg-[#161b22] p-0.5 w-fit">
        {(
          [
            { key: "all" as const, label: "All" },
            { key: "score" as const, label: "Score O/U" },
            { key: "event" as const, label: "Event Winner" },
            { key: "ranking" as const, label: "Rankings" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              filter === f.key ? "bg-[#21262d] text-[#e6edf3]" : "text-[#484f58]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Open markets */}
      {openMarkets.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-[#7d8590] uppercase tracking-wide mb-3">
            Open Markets ({openMarkets.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {openMarkets.map((m) => (
              <PredictionMarketCard
                key={m.id}
                market={m}
                pools={pools[m.id] ?? {}}
                balance={balance}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved markets */}
      {resolvedMarkets.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-[#7d8590] uppercase tracking-wide mb-3">
            Resolved ({resolvedMarkets.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resolvedMarkets.map((m) => (
              <PredictionMarketCard
                key={m.id}
                market={m}
                pools={pools[m.id] ?? {}}
                balance={balance}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main EventDetail ──────────────────────────────────────────

export function EventDetail({
  eventKey,
  eventName,
  matches,
  pools,
  balance,
  predictions = {},
  rankings = [],
  alliances = [],
  predictionMarkets = [],
  predictionPools = {},
}: Props) {
  const [tab, setTab] = useState<"matches" | "predictions" | "rankings" | "playoffs">("matches");

  const completedCount = matches.filter((m) => m.is_complete).length;
  const totalCount = matches.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[18px] font-semibold text-[#e6edf3]">{eventName}</h1>
          {completedCount > 0 && completedCount < totalCount && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#22c55e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#7d8590]">
            {completedCount}/{totalCount} matches completed
          </span>
          <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-[#21262d] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#22c55e] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#21262d] overflow-x-auto">
        {(
          [
            { key: "matches" as const, label: "Matches", count: totalCount },
            { key: "predictions" as const, label: "Predictions", count: predictionMarkets.filter((m) => m.status === "open").length },
            { key: "rankings" as const, label: "Rankings", count: rankings.length },
            { key: "playoffs" as const, label: "Playoffs", count: alliances.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 px-4 pb-2.5 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5",
              tab === t.key
                ? "text-[#e6edf3] border-[#e6edf3]"
                : "text-[#7d8590] border-transparent hover:text-[#e6edf3]"
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  tab === t.key ? "bg-[#21262d] text-[#e6edf3]" : "bg-[#161b22] text-[#484f58]"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "matches" && (
        <MatchesTab
          matches={matches}
          pools={pools}
          predictions={predictions}
          balance={balance}
        />
      )}
      {tab === "predictions" && (
        <PredictionsTab
          markets={predictionMarkets}
          pools={predictionPools}
          balance={balance}
        />
      )}
      {tab === "rankings" && <RankingsTab rankings={rankings} />}
      {tab === "playoffs" && <PlayoffsTab alliances={alliances} matches={matches} />}
    </div>
  );
}
