"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import type { Profile, PoolBetWithProfile } from "@/lib/types";
import type { PredictionBetWithMarket } from "@/db/predictions";

type Props = {
  profile: Profile;
  balance: number;
  bets: PoolBetWithProfile[];
  predictionBets?: PredictionBetWithMarket[];
  totalPnL: number;
  biggestWin: number;
  totalBets: number;
};

type GroupedPosition = {
  matchKey: string;
  bets: PoolBetWithProfile[];
  totalWagered: number;
  totalPayout: number;
  netProfit: number;
  isSettled: boolean;
  sides: Set<string>;
  result: string | null;
};

function groupByMatch(bets: PoolBetWithProfile[]): GroupedPosition[] {
  const map = new Map<string, GroupedPosition>();
  for (const bet of bets) {
    const existing = map.get(bet.match_key);
    if (existing) {
      existing.bets.push(bet);
      existing.totalWagered += bet.amount;
      existing.totalPayout += bet.payout ?? 0;
      existing.sides.add(bet.side);
      if (bet.payout === null) existing.isSettled = false;
    } else {
      map.set(bet.match_key, {
        matchKey: bet.match_key,
        bets: [bet],
        totalWagered: bet.amount,
        totalPayout: bet.payout ?? 0,
        netProfit: 0,
        isSettled: bet.payout !== null,
        sides: new Set([bet.side]),
        result: null,
      });
    }
  }
  for (const g of map.values()) {
    g.netProfit = g.totalPayout - g.totalWagered;
    if (g.isSettled) {
      g.result = g.netProfit > 0 ? "Won" : g.netProfit === 0 ? "Push" : "Lost";
    }
  }
  return [...map.values()];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ProfileDashboard({ profile, balance, bets, predictionBets = [], totalPnL, biggestWin, totalBets }: Props) {
  const [tab, setTab] = useState<"positions" | "predictions" | "activity">("positions");
  const [posTab, setPosTab] = useState<"active" | "closed">("active");
  const [searchQuery, setSearchQuery] = useState("");

  const initials = profile.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const groups = groupByMatch(bets);
  const activeGroups = groups.filter((g) => !g.isSettled);
  const closedGroups = groups.filter((g) => g.isSettled);

  const displayGroups = posTab === "active" ? activeGroups : closedGroups;
  const filtered = searchQuery
    ? displayGroups.filter((g) => g.matchKey.toLowerCase().includes(searchQuery.toLowerCase()))
    : displayGroups;

  return (
    <div className="space-y-6">
      {/* Profile header — two cards side by side like Polymarket */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
        {/* Left card: Profile info + stats */}
        <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-300 via-pink-300 to-teal-300 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-[#e6edf3]">
                {profile.display_name}
                {profile.team_number && (
                  <span className="text-[14px] text-[#484f58] font-normal ml-2">#{profile.team_number}</span>
                )}
              </h1>
              <p className="text-[12px] text-[#484f58]">
                Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
          {/* Stats row inside the card */}
          <div className="flex items-center gap-0 border-t border-[#21262d] pt-4">
            <div className="flex-1">
              <div className="text-[16px] font-bold text-[#e6edf3] tabular-nums font-mono">
                ${balance.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#484f58]">Positions Value</div>
            </div>
            <div className="flex-1 border-l border-[#21262d] pl-4">
              <div className="text-[16px] font-bold text-[#e6edf3] tabular-nums font-mono">
                ${biggestWin > 0 ? biggestWin.toLocaleString() : "0"}
              </div>
              <div className="text-[11px] text-[#484f58]">Biggest Win</div>
            </div>
            <div className="flex-1 border-l border-[#21262d] pl-4">
              <div className="text-[16px] font-bold text-[#e6edf3] tabular-nums font-mono">
                {totalBets}
              </div>
              <div className="text-[11px] text-[#484f58]">Predictions</div>
            </div>
          </div>
        </div>

        {/* Right card: P&L chart */}
        <PnLChart bets={bets} totalPnL={totalPnL} />
      </div>

      {/* Tabs: Positions / Activity */}
      <div className="flex items-center gap-6 border-b border-[#21262d]">
        <button
          onClick={() => setTab("positions")}
          className={cn(
            "pb-2.5 text-[14px] font-medium transition-colors border-b-2",
            tab === "positions"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#484f58] border-transparent hover:text-[#7d8590]"
          )}
        >
          Positions
        </button>
        <button
          onClick={() => setTab("predictions")}
          className={cn(
            "pb-2.5 text-[14px] font-medium transition-colors border-b-2",
            tab === "predictions"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#484f58] border-transparent hover:text-[#7d8590]"
          )}
        >
          Predictions {predictionBets.length > 0 && <span className="ml-1 text-[11px] text-[#484f58]">({predictionBets.length})</span>}
        </button>
        <button
          onClick={() => setTab("activity")}
          className={cn(
            "pb-2.5 text-[14px] font-medium transition-colors border-b-2",
            tab === "activity"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#484f58] border-transparent hover:text-[#7d8590]"
          )}
        >
          Activity
        </button>
      </div>

      {tab === "positions" ? (
        <div className="space-y-4">
          {/* Sub tabs + search */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-lg bg-[#161b22] p-0.5">
              <button
                onClick={() => setPosTab("active")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                  posTab === "active" ? "bg-[#21262d] text-[#e6edf3]" : "text-[#484f58]"
                )}
              >
                Active
              </button>
              <button
                onClick={() => setPosTab("closed")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                  posTab === "closed" ? "bg-[#21262d] text-[#e6edf3]" : "text-[#484f58]"
                )}
              >
                Closed
              </button>
            </div>
            <div className="relative flex-1 max-w-[240px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#484f58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search positions"
                className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] pl-9 pr-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
            </div>
          </div>

          {/* Positions table */}
          <div className="rounded-xl bg-[#161b22] overflow-hidden">
            <div className="hidden sm:grid grid-cols-[60px_1fr_120px_140px] gap-2 px-4 py-2.5 text-[10px] font-medium text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
              <span>Result</span>
              <span>Market</span>
              <span className="text-right">Total Traded</span>
              <span className="text-right">Profit/Loss</span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[13px] text-[#484f58]">
                {posTab === "active" ? "No active positions" : "No closed positions"}
              </div>
            ) : (
              filtered.map((group) => (
                <Link
                  key={group.matchKey}
                  href={`/market/${encodeURIComponent(group.matchKey)}`}
                  className="flex flex-col sm:grid sm:grid-cols-[60px_1fr_120px_140px] gap-1 sm:gap-2 sm:items-center px-4 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
                >
                  {/* Result badge */}
                  <div>
                    {group.result === "Won" && (
                      <span className="rounded bg-[#16332a] px-2 py-0.5 text-[10px] font-semibold text-[#22c55e]">Won</span>
                    )}
                    {group.result === "Lost" && (
                      <span className="rounded bg-[#3b1c1c] px-2 py-0.5 text-[10px] font-semibold text-[#ef4444]">Lost</span>
                    )}
                    {group.result === "Push" && (
                      <span className="rounded bg-[#21262d] px-2 py-0.5 text-[10px] font-semibold text-[#7d8590]">Push</span>
                    )}
                    {!group.result && (
                      <span className="rounded bg-[#1c2128] px-2 py-0.5 text-[10px] font-semibold text-[#388bfd]">Open</span>
                    )}
                  </div>

                  {/* Market info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {group.sides.has("red") && <span className="h-2 w-2 rounded-full bg-[#ef4444]" />}
                        {group.sides.has("blue") && <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />}
                      </div>
                      <span className="text-[13px] text-[#e6edf3] truncate">{group.matchKey}</span>
                    </div>
                    <span className="text-[10px] text-[#484f58]">
                      {group.bets.length} bet{group.bets.length > 1 ? "s" : ""}
                      {" · "}
                      {[...group.sides].map((s) => s === "red" ? "Red" : "Blue").join(" & ")}
                    </span>
                  </div>

                  {/* Total traded */}
                  <div className="text-right text-[13px] text-[#e6edf3] tabular-nums font-mono">
                    ${group.totalWagered.toLocaleString()}
                  </div>

                  {/* P&L */}
                  <div className="text-right">
                    {group.isSettled ? (
                      <>
                        <div className="text-[13px] text-[#e6edf3] tabular-nums font-mono">
                          ${group.totalPayout.toLocaleString()}
                        </div>
                        <div className={cn(
                          "text-[11px] tabular-nums font-mono",
                          group.netProfit > 0 ? "text-[#22c55e]" : group.netProfit < 0 ? "text-[#ef4444]" : "text-[#7d8590]"
                        )}>
                          {group.netProfit > 0 ? "+" : ""}${group.netProfit.toLocaleString()}
                          {group.totalWagered > 0 && ` (${((group.netProfit / group.totalWagered) * 100).toFixed(1)}%)`}
                        </div>
                      </>
                    ) : (
                      <span className="text-[12px] text-[#484f58]">Pending</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : tab === "predictions" ? (
        /* Predictions tab */
        <div className="rounded-xl bg-[#161b22] overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2.5 text-[10px] font-medium text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
            <span>Market</span>
            <span className="text-right">Bet</span>
            <span className="text-right">Payout</span>
          </div>

          {predictionBets.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-[#484f58]">
              No prediction bets yet
            </div>
          ) : (
            predictionBets.map((bet) => {
              const isWon = bet.payout !== null && bet.payout > 0;
              const isLost = bet.payout !== null && bet.payout === 0;
              const isPending = bet.payout === null;
              const isScore = bet.predicted_red !== null;

              return (
                <div
                  key={bet.id}
                  className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[13px] text-[#e6edf3] block truncate">
                      {isScore
                        ? `Score: ${bet.predicted_red}-${bet.predicted_blue}`
                        : bet.option_label}
                    </span>
                    <span className="text-[11px] text-[#484f58] block truncate">
                      {bet.market_title}
                    </span>
                    <span className="text-[10px] text-[#484f58]">
                      {isPending ? "Pending" : isWon ? "Won" : "Lost"}
                      {" · "}
                      {new Date(bet.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <span className="text-right text-[13px] text-[#e6edf3] tabular-nums font-mono">
                    ${bet.amount.toLocaleString()}
                  </span>
                  <span className={cn(
                    "text-right text-[13px] tabular-nums font-mono",
                    isPending ? "text-[#7d8590]" : isWon ? "text-[#22c55e]" : "text-[#ef4444]"
                  )}>
                    {isPending ? "—" : `$${(bet.payout ?? 0).toLocaleString()}`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Activity tab */
        <div className="rounded-xl bg-[#161b22] overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_120px] gap-2 px-4 py-2.5 text-[10px] font-medium text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
            <span>Type</span>
            <span>Market</span>
            <span className="text-right">Amount</span>
          </div>

          {bets.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-[#484f58]">
              No activity yet
            </div>
          ) : (
            bets.map((bet) => (
              <Link
                key={bet.id}
                href={`/market/${encodeURIComponent(bet.match_key)}`}
                className="grid grid-cols-[60px_1fr_120px] gap-2 items-center px-4 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
              >
                {/* Type */}
                <span className={cn(
                  "text-[11px] font-medium",
                  bet.payout === null ? "text-[#388bfd]" :
                  bet.payout > bet.amount ? "text-[#22c55e]" :
                  bet.payout === 0 ? "text-[#ef4444]" : "text-[#7d8590]"
                )}>
                  {bet.payout === null ? "Buy" :
                   bet.payout > bet.amount ? "Won" :
                   bet.payout === 0 ? "Lost" : "Refund"}
                </span>

                {/* Market */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      bet.side === "red" ? "bg-[#ef4444]" : "bg-[#3b82f6]"
                    )} />
                    <span className="text-[13px] text-[#e6edf3] truncate">{bet.match_key}</span>
                  </div>
                  <span className="text-[10px] text-[#484f58]">
                    ${bet.amount} · {bet.side === "red" ? "Red" : "Blue"}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <div className="text-[13px] text-[#e6edf3] tabular-nums font-mono">
                    ${bet.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#484f58]">{timeAgo(bet.created_at)}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PnLChart({ bets, totalPnL }: { bets: PoolBetWithProfile[]; totalPnL: number }) {
  const [timeTab, setTimeTab] = useState("ALL");

  const chartData = useMemo(() => {
    // Build cumulative P&L from settled bets sorted by time
    const settled = bets
      .filter((b) => b.payout !== null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    if (settled.length === 0) return [];

    let cumulative = 0;
    const points = [{ time: "Start", value: 0 }];

    for (const bet of settled) {
      cumulative += (bet.payout! - bet.amount);
      points.push({
        time: new Date(bet.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: cumulative,
      });
    }

    return points;
  }, [bets]);

  const isPositive = totalPnL >= 0;
  const color = isPositive ? "#22c55e" : "#ef4444";
  const gradientId = isPositive ? "pnlGreen" : "pnlRed";

  const timeTabs = ["1D", "1W", "1M", "ALL"];
  const periodLabel = timeTab === "1D" ? "Past Day" : timeTab === "1W" ? "Past Week" : timeTab === "1M" ? "Past Month" : "All Time";

  return (
    <div className="rounded-xl bg-[#161b22] border border-[#21262d] px-5 py-4">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-sm ${isPositive ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
            <span className="text-[12px] text-[#7d8590]">Profit/Loss</span>
          </div>
          <div className="flex gap-1">
            {timeTabs.map((t) => (
              <button
                key={t}
                onClick={() => setTimeTab(t)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                  timeTab === t ? "bg-[#21262d] text-[#e6edf3]" : "text-[#484f58] hover:text-[#7d8590]"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className={cn(
          "text-[26px] font-bold tabular-nums font-mono",
          isPositive ? "text-[#e6edf3]" : "text-[#e6edf3]"
        )}>
          {totalPnL < 0 ? "-" : ""}${Math.abs(totalPnL).toLocaleString()}.00
        </div>
        <p className="text-[10px] text-[#484f58] mt-0.5">{periodLabel}</p>

        {/* Chart */}
        <div className="h-[80px] mt-3 -mx-2">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1c2128",
                    border: "1px solid #30363d",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  labelStyle={{ color: "#7d8590" }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, "P&L"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[11px] text-[#484f58]">
              Chart appears after first resolved bet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
