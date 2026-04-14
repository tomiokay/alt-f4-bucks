import { redirect } from "next/navigation";
import { MatchBrowser } from "@/components/match-browser";
import { EventSync } from "@/components/event-sync";
import { AutoSync } from "@/components/auto-sync";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getActiveEventKeys,
  getCachedMatches,
  getUpcomingMatches,
  getUserPoolBets,
  getAllPoolSummaries,
} from "@/db/bets";
import type { MatchCache, PoolSummary } from "@/lib/types";

export default async function BettingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [balance, bets, eventKeys, poolMap] = await Promise.all([
    getUserBalance(profile.id),
    getUserPoolBets(profile.id),
    getActiveEventKeys(),
    getAllPoolSummaries(),
  ]);

  let allMatches: MatchCache[] = [];
  if (eventKeys.length > 0) {
    const matchArrays = await Promise.all(
      eventKeys.map((ek) => getCachedMatches(ek))
    );
    allMatches = matchArrays.flat();
  } else {
    allMatches = await getUpcomingMatches(50);
  }

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  // Skip Statbotics on this page — too slow, use pool odds only
  const predictions: Record<string, { redWinProb: number; blueWinProb: number }> = {};

  const activeBets = bets.filter((b) => b.payout === null);
  const totalAtRisk = activeBets.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-5">
      <AutoSync />
      <EventSync />

      <div className="flex items-center gap-6 text-[13px]">
        <div>
          <span className="text-[#484f58]">Portfolio </span>
          <span className="text-[#e6edf3] font-semibold font-mono tabular-nums">
            ${balance.toLocaleString()}
          </span>
        </div>
        {activeBets.length > 0 && (
          <>
            <div>
              <span className="text-[#484f58]">Positions </span>
              <span className="text-[#e6edf3] font-medium">{activeBets.length}</span>
            </div>
            <div>
              <span className="text-[#484f58]">At risk </span>
              <span className="text-[#ef4444] font-medium font-mono tabular-nums">
                ${totalAtRisk.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-[#e6edf3]">All markets</h2>
      </div>

      <MatchBrowser
        matches={allMatches}
        pools={pools}
        predictions={predictions}
        balance={balance}
      />
    </div>
  );
}
