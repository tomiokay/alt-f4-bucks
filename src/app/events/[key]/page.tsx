import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getCachedMatches, getAllPoolSummaries } from "@/db/bets";
import { getEventPredictionMarkets, getAllPredictionPools } from "@/db/predictions";
import { EventDetail } from "@/components/event-detail";
import { AutoSync } from "@/components/auto-sync";
import type { PoolSummary, PredictionPoolOption } from "@/lib/types";
import { getEventRankings, getEventAlliances } from "@/lib/tba";
import { getEventPredictions } from "@/lib/statbotics";
import { ensureEventMarkets, resolveScoreMarkets } from "@/app/actions/predictions";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function EventPage({ params }: Props) {
  const { key } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [matches, poolMap, balance, rankings, alliances, predictionsMap] = await Promise.all([
    getCachedMatches(key),
    getAllPoolSummaries(),
    getUserBalance(profile.id),
    getEventRankings(key),
    getEventAlliances(key),
    getEventPredictions(key),
  ]);

  if (matches.length === 0) notFound();

  const pools: Record<string, PoolSummary> = {};
  for (const [k, v] of poolMap) {
    pools[k] = v;
  }

  const predictions: Record<string, { redWinProb: number; blueWinProb: number }> = {};
  const fullPredictions: Record<string, { redPredScore?: number; bluePredScore?: number }> = {};
  for (const [k, v] of predictionsMap) {
    predictions[k] = { redWinProb: v.redWinProb, blueWinProb: v.blueWinProb };
    fullPredictions[k] = { redPredScore: v.redPredScore, bluePredScore: v.bluePredScore };
  }

  // Ensure markets exist before fetching (must await so they appear on first load)
  await Promise.allSettled([
    ensureEventMarkets(key, matches, fullPredictions, rankings, alliances),
    resolveScoreMarkets(key),
  ]);

  // Fetch prediction markets and pools
  const [predictionMarkets, predPoolsMap] = await Promise.all([
    getEventPredictionMarkets(key),
    getAllPredictionPools(key),
  ]);

  // Convert Map<string, Map<...>> to serializable Record<string, Record<string, ...>>
  const predictionPools: Record<string, Record<string, PredictionPoolOption>> = {};
  for (const [mId, optMap] of predPoolsMap) {
    const opts: Record<string, PredictionPoolOption> = {};
    for (const [optKey, optVal] of optMap) {
      opts[optKey] = optVal;
    }
    predictionPools[mId] = opts;
  }

  const eventName = matches[0].event_name;
  const qualTotal = matches.filter((m) => m.comp_level === "qm").length;
  const qualPlayed = matches.filter((m) => m.comp_level === "qm" && m.is_complete).length;

  return (
    <div>
      <AutoSync />
      <EventDetail
        eventKey={key}
        eventName={eventName}
        matches={matches}
        pools={pools}
        balance={balance}
        predictions={predictions}
        rankings={rankings}
        alliances={alliances}
        predictionMarkets={predictionMarkets}
        predictionPools={predictionPools}
        qualPlayed={qualPlayed}
        qualTotal={qualTotal}
      />
    </div>
  );
}
