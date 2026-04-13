"use client";

import { cn } from "@/lib/utils";
import type { PoolBetWithProfile } from "@/lib/types";

type Props = {
  bets: PoolBetWithProfile[];
};

export function MyBets({ bets }: Props) {
  const active = bets.filter((b) => b.payout === null);
  const settled = bets.filter((b) => b.payout !== null);

  if (bets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] text-[#7d8590]">No positions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <PositionsTable title="Active" bets={active} />
      )}
      {settled.length > 0 && (
        <PositionsTable title="Closed" bets={settled} />
      )}
    </div>
  );
}

function PositionsTable({ title, bets }: { title: string; bets: PoolBetWithProfile[] }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-[#7d8590] uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="rounded-xl bg-[#161b22] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 px-4 py-2 text-[11px] font-medium text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
          <span>Market</span>
          <span className="text-right">Avg</span>
          <span className="text-right">Current</span>
          <span className="text-right">Value</span>
        </div>
        {/* Rows */}
        {bets.map((bet) => {
          const isSettled = bet.payout !== null;
          const won = isSettled && bet.payout! > 0;
          const lost = isSettled && bet.payout === 0;
          const refunded = isSettled && bet.payout === bet.amount;
          const profit = isSettled ? bet.payout! - bet.amount : 0;
          const profitPct = bet.amount > 0 ? ((profit / bet.amount) * 100).toFixed(1) : "0";

          return (
            <div
              key={bet.id}
              className="grid grid-cols-[1fr_80px_80px_100px] gap-2 items-center px-4 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
            >
              {/* Market */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    bet.side === "red" ? "bg-[#ef4444]" : "bg-[#3b82f6]"
                  )}
                />
                <div className="min-w-0">
                  <div className="text-[13px] text-[#e6edf3] truncate">
                    {bet.match_key}
                  </div>
                  <div className="text-[11px] text-[#484f58]">
                    {bet.side === "red" ? "Red" : "Blue"} ·{" "}
                    <span className={cn(
                      bet.side === "red" ? "text-[#ef4444]" : "text-[#3b82f6]"
                    )}>
                      {bet.side === "red" ? "Yes" : "Yes"}
                    </span>
                    {" "}· {bet.amount} shares
                  </div>
                </div>
              </div>

              {/* Avg */}
              <div className="text-right text-[13px] text-[#e6edf3] tabular-nums font-mono">
                —
              </div>

              {/* Current */}
              <div className="text-right text-[13px] text-[#e6edf3] tabular-nums font-mono">
                {isSettled ? (won && !refunded ? "$1" : lost ? "$0" : "—") : "—"}
              </div>

              {/* Value */}
              <div className="text-right">
                <div className="text-[13px] text-[#e6edf3] tabular-nums font-mono">
                  ${isSettled ? (bet.payout ?? 0).toLocaleString() : bet.amount.toLocaleString()}
                </div>
                {isSettled && !refunded && (
                  <div
                    className={cn(
                      "text-[11px] tabular-nums font-mono",
                      won ? "text-[#22c55e]" : "text-[#ef4444]"
                    )}
                  >
                    {won ? "+" : ""}${profit.toLocaleString()} ({profitPct}%)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
