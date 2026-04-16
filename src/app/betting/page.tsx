import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MatchBrowser } from "@/components/match-browser";
import { AutoSync } from "@/components/auto-sync";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getUserPoolBets,
  getAllPoolSummaries,
  searchMatches,
} from "@/db/bets";
import { createServiceClient } from "@/lib/supabase/server";
import type { MatchCache, PoolSummary } from "@/lib/types";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function BettingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center gap-6">
        <div className="h-4 w-24 bg-[#161b22] rounded" />
        <div className="h-4 w-20 bg-[#161b22] rounded" />
      </div>
      <div className="h-8 w-48 bg-[#161b22] rounded" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[160px]" />
        ))}
      </div>
    </div>
  );
}

export default async function BettingPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <div className="space-y-5">
      <AutoSync />
      <Suspense fallback={<BettingSkeleton />}>
        <BettingContent userId={profile.id} query={query} q={q} />
      </Suspense>
    </div>
  );
}

async function BettingContent({ userId, query, q }: { userId: string; query: string; q?: string }) {
  const service = await createServiceClient();

  const [balance, bets, poolMap] = await Promise.all([
    getUserBalance(userId),
    getUserPoolBets(userId),
    getAllPoolSummaries(),
  ]);

  let allMatches: MatchCache[] = [];

  if (query) {
    allMatches = await searchMatches(query.toLowerCase());
  } else {
    // Fetch all non-complete matches + recently completed
    const results: MatchCache[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;

    // Get upcoming/live matches (not complete)
    while (true) {
      const { data } = await service
        .from("match_cache")
        .select("*")
        .eq("is_complete", false)
        .order("scheduled_time", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (!data || data.length === 0) break;
      results.push(...(data as MatchCache[]));
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    // Also get recently completed (last 2 weeks) for context
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDone } = await service
      .from("match_cache")
      .select("*")
      .eq("is_complete", true)
      .gte("scheduled_time", twoWeeksAgo)
      .order("scheduled_time", { ascending: false })
      .range(0, 999);

    if (recentDone) results.push(...(recentDone as MatchCache[]));
    allMatches = results;
  }

  const pools: Record<string, PoolSummary> = {};
  for (const [key, val] of poolMap) {
    pools[key] = val;
  }

  const predictions: Record<string, { redWinProb: number; blueWinProb: number }> = {};

  const activeBets = bets.filter((b) => b.payout === null);
  const totalAtRisk = activeBets.reduce((s, b) => s + b.amount, 0);

  return (
    <>
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
    </>
  );
}
