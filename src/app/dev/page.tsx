import { redirect } from "next/navigation";
import { getCurrentProfile, getAllProfiles } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { DevPanel } from "@/components/dev-panel";
import {
  getActiveEventKeys,
  getCachedMatches,
} from "@/db/bets";
import type { MatchCache } from "@/lib/types";

export default async function DevPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    redirect("/");
  }

  const [balance, eventKeys, allProfiles] = await Promise.all([
    getUserBalance(profile.id),
    getActiveEventKeys(),
    getAllProfiles(),
  ]);

  let unresolvedMatches: MatchCache[] = [];
  if (eventKeys.length > 0) {
    const arrays = await Promise.all(eventKeys.map((ek) => getCachedMatches(ek)));
    const all = arrays.flat();
    unresolvedMatches = all.filter((m) => !m.is_complete).slice(0, 200);
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
      />
    </div>
  );
}
