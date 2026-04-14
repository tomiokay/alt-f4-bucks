"use client";

import type { PoolBetWithProfile } from "@/lib/types";

type Props = {
  bets: PoolBetWithProfile[];
};

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

export function RecentTrades({ bets }: Props) {
  if (bets.length === 0) {
    return (
      <div className="rounded-xl bg-[#161b22] p-4">
        <h3 className="text-[14px] font-semibold text-[#e6edf3] mb-3">Recent trades</h3>
        <p className="text-[13px] text-[#484f58] text-center py-6">No trades yet — be the first!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
      <h3 className="text-[14px] font-semibold text-[#e6edf3] mb-3">Recent trades</h3>
      <div className="space-y-2">
        {bets.slice(0, 10).map((bet) => (
          <div key={bet.id} className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-[7px] font-bold shrink-0">
                {bet.user?.display_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="text-[#e6edf3]">{bet.user?.display_name ?? "Anonymous"}</span>
              <span className="text-[#484f58]">bought</span>
              <span className={bet.side === "red" ? "text-[#ef4444] font-medium" : "text-[#3b82f6] font-medium"}>
                {bet.side === "red" ? "Red" : "Blue"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[#e6edf3] tabular-nums font-mono">${bet.amount}</span>
              <span className="text-[#484f58]">{timeAgo(bet.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
