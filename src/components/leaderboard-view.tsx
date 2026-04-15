"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

type BigWin = {
  display_name: string;
  match_key: string;
  amount: number;
  payout: number;
  profit: number;
};

type Props = {
  entries: LeaderboardEntry[];
  biggestWins?: BigWin[];
};

export function LeaderboardView({ entries, biggestWins = [] }: Props) {
  const [timeTab, setTimeTab] = useState<"weekly" | "monthly" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? entries.filter((e) => e.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  // Top winners for the sidebar
  const topWinners = entries.slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-6">
        {/* Main table */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-semibold text-[#e6edf3] mb-4">Leaderboard</h1>

          {/* Time tabs */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1 rounded-lg bg-[#161b22] p-0.5">
              {(["weekly", "monthly", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeTab(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[12px] font-medium capitalize transition-colors",
                    timeTab === t ? "bg-[#21262d] text-[#e6edf3]" : "text-[#484f58]"
                  )}
                >
                  {t === "all" ? "All Time" : t}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#484f58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name"
                className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] pl-9 pr-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-[#161b22] overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_120px_120px] gap-2 px-5 py-2.5 text-[10px] font-medium text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
              <span>#</span>
              <span>Trader</span>
              <span className="text-right">Profit/Loss</span>
              <span className="text-right">Volume</span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[13px] text-[#484f58]">
                No traders found
              </div>
            ) : (
              filtered.map((entry, i) => {
                const initials = entry.display_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const isTop3 = i < 3;

                return (
                  <div
                    key={entry.user_id}
                    className="grid grid-cols-[40px_1fr_120px_120px] gap-2 items-center px-5 py-3 border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors"
                  >
                    <span className={cn(
                      "text-[14px] tabular-nums",
                      isTop3 ? "text-[#e6edf3] font-semibold" : "text-[#484f58]"
                    )}>
                      {i + 1}
                    </span>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        i === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black" :
                        i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black" :
                        i === 2 ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white" :
                        "bg-gradient-to-br from-purple-400 to-pink-500 text-white"
                      )}>
                        {initials}
                      </div>
                      <span className="text-[14px] text-[#e6edf3] truncate">{entry.display_name}</span>
                    </div>

                    <span className={cn(
                      "text-right text-[14px] tabular-nums font-mono font-medium",
                      entry.balance > 1000 ? "text-[#22c55e]" : entry.balance < 1000 ? "text-[#ef4444]" : "text-[#e6edf3]"
                    )}>
                      {entry.balance > 1000 ? "+" : ""}${(entry.balance - 1000).toLocaleString()}
                    </span>

                    <span className="text-right text-[14px] text-[#7d8590] tabular-nums font-mono">
                      ${entry.balance.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right sidebar: Biggest wins */}
        <div className="hidden lg:block w-[280px] shrink-0">
          <div className="rounded-xl bg-[#161b22] p-4">
            <h3 className="text-[13px] font-semibold text-[#e6edf3] mb-3">Biggest wins this week</h3>
            {biggestWins.length === 0 ? (
              <p className="text-[12px] text-[#484f58] text-center py-4">No wins this week yet</p>
            ) : (
              <div className="space-y-3">
                {biggestWins.map((win, i) => {
                  const initials = win.display_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={`${win.match_key}-${i}`} className="flex items-start gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] text-[#e6edf3] block truncate">{win.display_name}</span>
                        <span className="text-[10px] text-[#484f58] truncate block">{win.match_key}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[12px] text-[#22c55e] tabular-nums font-mono font-medium block">
                          +${win.profit.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#484f58]">
                          ${win.amount.toLocaleString()} bet
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
