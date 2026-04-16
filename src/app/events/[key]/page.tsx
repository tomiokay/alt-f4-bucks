import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getCachedMatches, getAllPoolSummaries } from "@/db/bets";
import { getEventPredictionMarkets, getAllPredictionPools } from "@/db/predictions";
import { EventDetail } from "@/components/event-detail";
import { AutoSync } from "@/components/auto-sync";
import type { PoolSummary, PredictionPoolOption } from "@/lib/types";
import { getEventRankings, getEventAlliances, getEventTeams, getEventInfo } from "@/lib/tba";
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

  if (matches.length === 0) {
    // No match schedule — show team list from TBA
    const [eventInfo, teams] = await Promise.all([
      getEventInfo(key),
      getEventTeams(key),
    ]);

    const eventName = eventInfo?.name ?? key;
    const sortedTeams = teams.sort((a, b) => a.team_number - b.team_number);

    return (
      <div className="space-y-6">
        <div>
          <Link href="/events" className="text-[12px] text-[#388bfd] hover:text-[#58a6ff] mb-2 inline-block">
            ← Back to events
          </Link>
          <h1 className="text-[20px] font-semibold text-[#e6edf3]">{eventName}</h1>
          {eventInfo && (
            <p className="text-[12px] text-[#7d8590] mt-1">
              {new Date(eventInfo.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              {" — "}
              {new Date(eventInfo.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-[#161b22] border border-[#21262d] p-5">
          <p className="text-[14px] text-[#7d8590] text-center py-4">
            No match schedule yet — check back when matches are posted on TBA
          </p>
        </div>

        {sortedTeams.length > 0 && (
          <div>
            <h2 className="text-[16px] font-semibold text-[#e6edf3] mb-3">
              Teams ({sortedTeams.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sortedTeams.map((team) => (
                <div
                  key={team.key}
                  className="rounded-lg bg-[#161b22] border border-[#21262d] px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-[14px] font-semibold text-[#e6edf3] tabular-nums font-mono w-12">
                    {team.team_number}
                  </span>
                  <span className="text-[13px] text-[#7d8590] truncate">
                    {team.nickname}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

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
