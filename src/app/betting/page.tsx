import { redirect } from "next/navigation";
import { MatchBrowser } from "@/components/match-browser";
import { AutoSync } from "@/components/auto-sync";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getActiveEventKeys,
  getCachedMatches,
  getUpcomingMatches,
  getUserPoolBets,
  getAllPoolSummaries,
  searchMatches,
} from "@/db/bets";
import type { MatchCache, PoolSummary } from "@/lib/types";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function BettingPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [balance, bets, poolMap] = await Promise.all([
    getUserBalance(profile.id),
    getUserPoolBets(profile.id),
    getAllPoolSummaries(),
  ]);

  let allMatches: MatchCache[] = [];

  if (query) {
    // Search directly in DB
    allMatches = await searchMatches(query.toLowerCase());
  } else {
    // Load all events
    const eventKeys = await getActiveEventKeys();
    if (eventKeys.length > 0) {
      const matchArrays = await Promise.all(
        eventKeys.map((ek) => getCachedMatches(ek))
      );
      allMatches = matchArrays.flat();
    } else {
      allMatches = await getUpcomingMatches(50);
    }
  }

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  const predictions: Record<string, { redWinProb: number; blueWinProb: number }> = {};

  const activeBets = bets.filter((b) => b.payout === null);
  const totalAtRisk = activeBets.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-5">
      <AutoSync />

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
        <h2 className="text-[16px] font-semibold text-[#e6edf3]">
          {query ? `Results for "${q}"` : "All markets"}
        </h2>
        {query && (
          <a href="/betting" className="text-[12px] text-[#388bfd] hover:text-[#58a6ff]">
            Clear search
          </a>
        )}
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
