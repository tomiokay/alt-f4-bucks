import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEventMatches, getCurrentEvents, tbaMatchToCache } from "@/lib/tba";
import { getActiveEventKeys } from "@/db/bets";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Allow internal calls (from AutoSync component) and cron jobs with secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const referer = request.headers.get("referer");
  const isInternal = referer && (referer.includes("localhost") || referer.includes("alt-f4-bucks"));

  if (!isInternal && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();

  // Get current/upcoming events from TBA (next 2 weeks)
  const currentEvents = await getCurrentEvents();
  const eventNameMap = new Map(currentEvents.map((e) => [e.key, e.name]));

  // Merge: all TBA current events + any already-tracked events in our DB
  const trackedKeys = await getActiveEventKeys();
  const allKeys = new Set([
    ...currentEvents.map((e) => e.key),
    ...trackedKeys,
  ]);

  let totalSynced = 0;

  for (const eventKey of allKeys) {
    try {
      const matches = await getEventMatches(eventKey);
      if (matches.length === 0) continue;
      const eventName = eventNameMap.get(eventKey) ?? eventKey;
      const rows = matches.map((m) => tbaMatchToCache(m, eventName));

      const { error } = await service.from("match_cache").upsert(rows, {
        onConflict: "match_key",
      });

      if (!error) totalSynced += rows.length;
    } catch {
      // Skip events that fail
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
        // Get bets before resolving so we can notify
        const { data: betsToResolve } = await service
          .from("pool_bets")
          .select("id, user_id, side, amount")
          .eq("match_key", matchKey)
          .is("payout", null);

        const { data: count } = await service.rpc("resolve_match_pool", {
          p_match_key: matchKey,
          p_winning_side: winningSide,
          p_result: result,
        });
        totalResolved += (count as number) ?? 0;

        // Send notifications with payout amounts
        if (betsToResolve && betsToResolve.length > 0) {
          // Fetch resolved bets to get actual payout amounts
          const { data: resolvedBets } = await service
            .from("pool_bets")
            .select("id, user_id, side, amount, payout")
            .eq("match_key", matchKey)
            .in("id", betsToResolve.map((b) => b.id));

          const notifications = (resolvedBets ?? betsToResolve).map((bet) => {
            const won = bet.side === winningSide;
            const tied = winningSide === "tie";
            const payout = (bet as { payout?: number }).payout ?? 0;
            const multiplier = bet.amount > 0 ? (payout / bet.amount).toFixed(1) : "0";
            return {
              user_id: bet.user_id,
              type: tied ? "bet_refund" : won ? "bet_won" : "bet_lost",
              message: tied
                ? `Match ${matchKey} ended in a tie. Your $${bet.amount} bet was refunded.`
                : won
                  ? `You won your $${bet.amount.toLocaleString()} bet on ${bet.side} in ${matchKey}! Paid out $${payout.toLocaleString()} (${multiplier}x)`
                  : `You lost your $${bet.amount.toLocaleString()} bet on ${bet.side} in ${matchKey}.`,
              meta: { match_key: matchKey, bet_id: bet.id },
            };
          });
          await service.from("notifications").insert(notifications).throwOnError();
        }
      } catch {
        // Skip failed resolutions
      }
    }
  }

  // Resolve prediction markets for completed matches
  let predResolved = 0;
  try {
    const { resolveScoreMarkets } = await import("@/app/actions/predictions");
    for (const eventKey of allKeys) {
      predResolved += await resolveScoreMarkets(eventKey);
    }
  } catch {
    // Prediction tables may not exist yet
  }

  revalidatePath("/");
  revalidatePath("/betting");
  revalidatePath("/events");
  revalidatePath("/dashboard");

  return NextResponse.json({
    synced: totalSynced,
    resolved: totalResolved,
    predResolved,
    events: allKeys.size,
  });
}
