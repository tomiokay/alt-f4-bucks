import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getCachedMatches, getAllPoolSummaries } from "@/db/bets";
import { EventDetail } from "@/components/event-detail";
import { AutoSync } from "@/components/auto-sync";
import type { PoolSummary } from "@/lib/types";
import { getEventRankings, getEventAlliances } from "@/lib/tba";
import { getEventPredictions } from "@/lib/statbotics";

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
  for (const [k, v] of predictionsMap) {
    predictions[k] = v;
  }

  const eventName = matches[0].event_name;

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
      />
    </div>
  );
}
