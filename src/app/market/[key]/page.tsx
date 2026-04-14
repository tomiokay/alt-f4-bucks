import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import {
  getMatchByKey,
  getPoolSummary,
  getMatchPoolBets,
  getMatchComments,
  getRelatedMatches,
} from "@/db/bets";
import { calculateOdds } from "@/lib/odds";
import { MarketHeader } from "@/components/market/market-header";
import { MarketChart } from "@/components/market/market-chart";
import { TradingPanel } from "@/components/market/trading-panel";
import { RecentTrades } from "@/components/market/recent-trades";
import { CommentSection } from "@/components/market/comment-section";
import { RelatedMarkets } from "@/components/market/related-markets";
import { AutoSync } from "@/components/auto-sync";

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

  const [balance, pool, bets, comments, related] = await Promise.all([
    getUserBalance(profile.id),
    getPoolSummary(matchKey),
    getMatchPoolBets(matchKey),
    getMatchComments(matchKey),
    getRelatedMatches(match.event_key, matchKey),
  ]);

  const odds = calculateOdds(pool, null);

  const relatedWithOdds = related.map((m) => ({
    match: m,
    odds: calculateOdds(null, null),
  }));

  return (
    <div>
      <AutoSync />

      {/* Two column layout */}
      <div className="flex gap-6">
        {/* Left column — main content */}
        <div className="flex-1 min-w-0 space-y-5">
          <MarketHeader match={match} odds={odds} />
          <MarketChart redPct={odds.redPct} bluePct={odds.bluePct} />

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

        {/* Right column — trading + related */}
        <div className="hidden md:block w-[320px] shrink-0 space-y-4">
          <TradingPanel
            match={match}
            odds={odds}
            balance={balance}
          />
          <RelatedMarkets markets={relatedWithOdds} />
        </div>
      </div>
    </div>
  );
}
