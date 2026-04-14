"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { PoolBetWithProfile } from "@/lib/types";

type Props = {
  bets: PoolBetWithProfile[];
};

type GroupedPosition = {
  matchKey: string;
  bets: PoolBetWithProfile[];
  totalWagered: number;
  totalPayout: number;
  netProfit: number;
  isSettled: boolean;
  sides: Set<string>;
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
      });
    }
  }

  for (const group of map.values()) {
    group.netProfit = group.totalPayout - group.totalWagered;
  }

  return [...map.values()];
}

export function MyBets({ bets }: Props) {
  const [tab, setTab] = useState<"positions" | "activity">("positions");

  const groups = groupByMatch(bets);
  const active = groups.filter((g) => !g.isSettled);
  const settled = groups.filter((g) => g.isSettled);

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[#21262d] mb-4">
        <button
          onClick={() => setTab("positions")}
          className={cn(
            "pb-2 text-[13px] font-medium transition-colors border-b-2",
            tab === "positions"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#7d8590] border-transparent hover:text-[#e6edf3]"
          )}
        >
          Positions
        </button>
        <button
          onClick={() => setTab("activity")}
          className={cn(
            "pb-2 text-[13px] font-medium transition-colors border-b-2",
            tab === "activity"
              ? "text-[#e6edf3] border-[#e6edf3]"
              : "text-[#7d8590] border-transparent hover:text-[#e6edf3]"
          )}
        >
          Activity
        </button>
      </div>

      {tab === "positions" ? (
        <div className="space-y-6">
          {bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[14px] text-[#7d8590]">No positions found</p>
            </div>
          ) : (
            <>
              {active.length > 0 && <GroupedTable title="Active" groups={active} />}
              {settled.length > 0 && <GroupedTable title="Closed" groups={settled} />}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[14px] text-[#7d8590]">No activity yet</p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#161b22] overflow-hidden">
              {bets.map((bet) => (
                <Link
                  key={bet.id}
                  href={`/market/${encodeURIComponent(bet.match_key)}`}
                  className="flex items-center justify-between px-4 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      bet.side === "red" ? "bg-[#ef4444]" : "bg-[#3b82f6]"
                    )} />
                    <div>
                      <span className="text-[13px] text-[#e6edf3]">
                        Bet ${bet.amount} on {bet.side === "red" ? "Red" : "Blue"}
                      </span>
                      <span className="text-[11px] text-[#484f58] block">{bet.match_key}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {bet.payout !== null ? (
                      <span className={cn(
                        "text-[13px] font-mono tabular-nums",
                        bet.payout > bet.amount ? "text-[#22c55e]" : bet.payout === 0 ? "text-[#ef4444]" : "text-[#7d8590]"
                      )}>
                        {bet.payout > bet.amount ? "+" : ""}${(bet.payout - bet.amount).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#484f58]">Pending</span>
                    )}
                    <span className="text-[11px] text-[#484f58] block">
                      {new Date(bet.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupedTable({ title, groups }: { title: string; groups: GroupedPosition[] }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-[#7d8590] uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="rounded-xl bg-[#161b22] overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px] gap-2 px-4 py-2 text-[11px] font-medium text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
          <span>Market</span>
          <span className="text-right">Wagered</span>
          <span className="text-right">P&L</span>
        </div>
        {groups.map((group) => {
          const hasProfit = group.netProfit > 0;
          const hasLoss = group.netProfit < 0;

          return (
            <Link
              key={group.matchKey}
              href={`/market/${encodeURIComponent(group.matchKey)}`}
              className="grid grid-cols-[1fr_100px_100px] gap-2 items-center px-4 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex gap-0.5">
                  {group.sides.has("red") && <span className="h-2 w-2 rounded-full bg-[#ef4444]" />}
                  {group.sides.has("blue") && <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] text-[#e6edf3] truncate">{group.matchKey}</div>
                  <div className="text-[11px] text-[#484f58]">
                    {group.bets.length} bet{group.bets.length > 1 ? "s" : ""}
                    {group.sides.size > 1 && " · both sides"}
                  </div>
                </div>
              </div>

              <div className="text-right text-[13px] text-[#e6edf3] tabular-nums font-mono">
                ${group.totalWagered.toLocaleString()}
              </div>

              <div className="text-right">
                {group.isSettled ? (
                  <div className={cn(
                    "text-[13px] tabular-nums font-mono",
                    hasProfit ? "text-[#22c55e]" : hasLoss ? "text-[#ef4444]" : "text-[#7d8590]"
                  )}>
                    {hasProfit ? "+" : ""}${group.netProfit.toLocaleString()}
                  </div>
                ) : (
                  <span className="text-[11px] text-[#484f58]">Pending</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
