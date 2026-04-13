import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEventMatches, getCurrentEvents, tbaMatchToCache } from "@/lib/tba";
import { getActiveEventKeys } from "@/db/bets";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const service = await createServiceClient();

  // Get all event keys we're tracking
  const trackedKeys = await getActiveEventKeys();
  if (trackedKeys.length === 0) {
    return NextResponse.json({ synced: 0, resolved: 0 });
  }

  // Fetch current events for name lookup
  const currentEvents = await getCurrentEvents();
  const eventNameMap = new Map(currentEvents.map((e) => [e.key, e.name]));

  let totalSynced = 0;

  // Sync each tracked event from TBA
  for (const eventKey of trackedKeys) {
    try {
      const matches = await getEventMatches(eventKey);
      const eventName = eventNameMap.get(eventKey) ?? eventKey;
      const rows = matches.map((m) => tbaMatchToCache(m, eventName));

      const { error } = await service.from("match_cache").upsert(rows, {
        onConflict: "match_key",
      });

      if (!error) totalSynced += rows.length;
    } catch {
      // Skip events that fail (e.g., invalid key) — don't block others
    }
  }

  // Resolve any completed match pools
  let totalResolved = 0;

  const { data: unresolvedBets } = await service
    .from("pool_bets")
    .select("match_key")
    .is("payout", null);

  if (unresolvedBets && unresolvedBets.length > 0) {
    const matchKeys = [...new Set(unresolvedBets.map((b) => b.match_key))];

    for (const matchKey of matchKeys) {
      const { data: match } = await service
        .from("match_cache")
        .select("*")
        .eq("match_key", matchKey)
        .single();

      if (!match?.is_complete) continue;

      const winningSide =
        !match.winning_alliance || match.winning_alliance === ""
          ? "tie"
          : match.winning_alliance;

      const result = {
        red_score: match.red_score,
        blue_score: match.blue_score,
        winning_alliance: match.winning_alliance,
      };

      try {
        const { data: count } = await service.rpc("resolve_match_pool", {
          p_match_key: matchKey,
          p_winning_side: winningSide,
          p_result: result,
        });
        totalResolved += (count as number) ?? 0;
      } catch {
        // Skip failed resolutions
      }
    }
  }

  revalidatePath("/betting");
  revalidatePath("/popular");
  revalidatePath("/dashboard");

  return NextResponse.json({ synced: totalSynced, resolved: totalResolved });
}
