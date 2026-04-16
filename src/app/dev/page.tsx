import { redirect } from "next/navigation";
import { getCurrentProfile, getAllProfiles } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { DevPanel } from "@/components/dev-panel";
import {
  getActiveEventKeys,
  getCachedMatches,
} from "@/db/bets";
import { getAllOpenPredictionMarkets, getAllPredictionPoolSummaries } from "@/db/predictions";
import type { MatchCache, PredictionMarket, PredictionPoolOption } from "@/lib/types";

export default async function DevPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin"].includes(profile.role)) {
    redirect("/");
  }

  const [balance, eventKeys, allProfiles, predMarkets, predPoolsMap] = await Promise.all([
    getUserBalance(profile.id),
    getActiveEventKeys(),
    getAllProfiles(),
    getAllOpenPredictionMarkets(),
    getAllPredictionPoolSummaries(),
  ]);

  let unresolvedMatches: MatchCache[] = [];
  const eventNames: Record<string, string> = {};
  if (eventKeys.length > 0) {
    const arrays = await Promise.all(eventKeys.map((ek) => getCachedMatches(ek)));
    const all = arrays.flat();
    unresolvedMatches = all.filter((m) => !m.is_complete).slice(0, 200);
    for (const m of all) {
      if (!eventNames[m.event_key]) eventNames[m.event_key] = m.event_name;
    }
  }

  // Convert prediction pools map
  const predPools: Record<string, Record<string, PredictionPoolOption>> = {};
  for (const [mId, optMap] of predPoolsMap) {
    const opts: Record<string, PredictionPoolOption> = {};
    for (const [optKey, optVal] of optMap) {
      opts[optKey] = optVal;
    }
    predPools[mId] = opts;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[#e6edf3]">Dev Mode</h1>
        <p className="text-[12px] text-[#7d8590] mt-0.5">
          Create test matches, resolve them, grant bucks — test everything
        </p>
      </div>
      <DevPanel
        userId={profile.id}
        balance={balance}
        unresolvedMatches={unresolvedMatches}
        allProfiles={allProfiles}
        eventKeys={eventKeys}
        eventNames={eventNames}
        predictionMarkets={predMarkets}
        predictionPools={predPools}
      />
    </div>
  );
}
