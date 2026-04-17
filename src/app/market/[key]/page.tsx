import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getMatchByKey,
  getPoolSummary,
  getMatchPoolBets,
  getMatchComments,
  getRelatedMatches,
  getOddsHistory,
} from "@/db/bets";
import { getMatchPredictionMarkets, getPredictionPoolSummary } from "@/db/predictions";
import { calculateOdds } from "@/lib/odds";
import { MarketHeader } from "@/components/market/market-header";
import { MarketChart } from "@/components/market/market-chart";
import { TradingPanel } from "@/components/market/trading-panel";
import { RecentTrades } from "@/components/market/recent-trades";
import { CommentSection } from "@/components/market/comment-section";
import { RelatedMarkets } from "@/components/market/related-markets";
import { PredictionMarketCard } from "@/components/prediction-market-card";
import { ScorePredictionPanel } from "@/components/score-prediction-panel";
import { AutoSync } from "@/components/auto-sync";
import { ensureScorePredictions } from "@/app/actions/predictions";
import type { PredictionPoolOption } from "@/lib/types";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function MarketPage({ params }: Props) {
  const { key } = await params;
  const matchKey = decodeURIComponent(key);

  const match = await getMatchByKey(matchKey);
  if (!match) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // Ensure score prediction exists for this match
  if (!match.is_complete) {
    await ensureScorePredictions(match.event_key).catch(() => {});
  }

  const [balance, pool, bets, comments, related, oddsHistory, predMarkets] = await Promise.all([
    getUserBalance(profile.id),
    getPoolSummary(matchKey),
    getMatchPoolBets(matchKey),
    getMatchComments(matchKey),
    getRelatedMatches(match.event_key, matchKey),
    getOddsHistory(matchKey),
    getMatchPredictionMarkets(matchKey),
  ]);

  // Fetch pools for each prediction market
  const predPools: Record<string, Record<string, PredictionPoolOption>> = {};
  await Promise.all(
    predMarkets.map(async (m) => {
      const poolMap = await getPredictionPoolSummary(m.id);
      const opts: Record<string, PredictionPoolOption> = {};
      for (const [optKey, optVal] of poolMap) {
        opts[optKey] = optVal;
      }
      predPools[m.id] = opts;
    })
  );

  const odds = calculateOdds(pool, null);

  const relatedWithOdds = related.map((m) => ({
    match: m,
    odds: calculateOdds(null, null),
  }));

  return (
    <div>
      <AutoSync />

      {/* Two column layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column — main content */}
        <div className="flex-1 min-w-0 space-y-5">
          <MarketHeader match={match} odds={odds} />

          {/* Trading panel — mobile only (shown above chart) */}
          <div className="md:hidden space-y-4">
            <TradingPanel match={match} odds={odds} balance={balance} />
            {predMarkets.map((pm) =>
              pm.type === "score_prediction" ? (
                <ScorePredictionPanel
                  key={pm.id}
                  market={pm}
                  pools={predPools[pm.id] ?? {}}
                  balance={balance}
                  redTeams={match.red_teams}
                  blueTeams={match.blue_teams}
                  scheduledTime={match.scheduled_time}
                />
              ) : (
                <PredictionMarketCard
                  key={pm.id}
                  market={pm}
                  pools={predPools[pm.id] ?? {}}
                  balance={balance}
                />
              )
            )}
          </div>

          <MarketChart
            redPct={odds.redPct}
            bluePct={odds.bluePct}
            history={oddsHistory}
          />

          {/* Outcome proposed (if resolved) */}
          {match.is_complete && (
            <div className="flex items-center gap-2 rounded-lg bg-[#161b22] px-4 py-3 border border-[#21262d]">
              <span className={`h-2.5 w-2.5 rounded-full ${match.winning_alliance === "red" ? "bg-[#ef4444]" : "bg-[#3b82f6]"}`} />
              <span className="text-[13px] text-[#e6edf3]">
                Outcome: <span className="font-semibold">{match.winning_alliance === "red" ? "Red" : "Blue"} Alliance wins</span>
                {" "}({match.red_score} – {match.blue_score})
              </span>
            </div>
          )}

          <RecentTrades bets={bets} />
          <CommentSection
            matchKey={matchKey}
            comments={comments}
            userId={profile.id}
          />
        </div>

        {/* Right column — trading + related (desktop only) */}
        <div className="hidden md:block w-[320px] shrink-0 space-y-4">
          <TradingPanel
            match={match}
            odds={odds}
            balance={balance}
          />
          {predMarkets.map((pm) =>
            pm.type === "score_prediction" ? (
              <ScorePredictionPanel
                key={pm.id}
                market={pm}
                pools={predPools[pm.id] ?? {}}
                balance={balance}
              />
            ) : (
              <PredictionMarketCard
                key={pm.id}
                market={pm}
                pools={predPools[pm.id] ?? {}}
                balance={balance}
              />
            )
          )}
          <RelatedMarkets markets={relatedWithOdds} />
        </div>
      </div>
    </div>
  );
}
