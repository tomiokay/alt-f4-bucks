import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEventMatches, getCurrentEvents, tbaMatchToCache } from "@/lib/tba";
import { getActiveEventKeys } from "@/db/bets";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s on Vercel Pro

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const referer = request.headers.get("referer");
  const isInternal = referer && (referer.includes("localhost") || referer.includes("alt-f4-bucks"));

  if (!isInternal && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();

  // Support syncing a single event via ?event=2026onwel
  const singleEvent = request.nextUrl.searchParams.get("event");

  const currentEvents = await getCurrentEvents();
  const eventNameMap = new Map(currentEvents.map((e) => [e.key, e.name]));

  let allKeys: string[];
  if (singleEvent) {
    allKeys = [singleEvent];
  } else {
    const trackedKeys = await getActiveEventKeys();
    // On free tier, limit to tracked events + recent TBA events (last 2 weeks)
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const recentTbaKeys = currentEvents
      .filter((e) => {
        const end = new Date(e.end_date + "T23:59:59");
        const start = new Date(e.start_date);
        return end >= twoWeeksAgo && start <= twoWeeksAhead;
      })
      .map((e) => e.key);

    allKeys = [...new Set([...recentTbaKeys, ...trackedKeys])];
  }

  let totalSynced = 0;
  let eventsWithMatches = 0;
  let fetchErrors = 0;

  for (const eventKey of allKeys) {
    try {
      const matches = await getEventMatches(eventKey);
      if (matches.length === 0) continue;
      eventsWithMatches++;
      const eventName = eventNameMap.get(eventKey) ?? eventKey;
      const rows = matches.map((m) => tbaMatchToCache(m, eventName));

      let { error } = await service.from("match_cache").upsert(rows, {
        onConflict: "match_key",
      });

      // If upsert fails due to missing columns, retry without optional fields
      if (error && error.code === "PGRST204") {
        const basicRows = rows.map(({ red_auto_points, blue_auto_points, red_rp, blue_rp, ...rest }) => rest);
        const retry = await service.from("match_cache").upsert(basicRows, {
          onConflict: "match_key",
        });
        error = retry.error;
      }

      if (!error) {
        totalSynced += rows.length;
      } else {
        fetchErrors++;
        if (singleEvent) {
          return NextResponse.json({ error: error.message, code: error.code, eventKey });
        }
      }
    } catch (e) {
      fetchErrors++;
      if (singleEvent) {
        return NextResponse.json({ error: String(e), eventKey });
      }
    }
  }

  // Resolve any completed match pools
  let totalResolved = 0;
  const matchKeysToResolve = new Set<string>();

  const { data: unresolvedBets } = await service
    .from("pool_bets")
    .select("match_key")
    .is("payout", null);

  if (unresolvedBets) {
    for (const b of unresolvedBets) matchKeysToResolve.add(b.match_key);
  }

  for (const matchKey of matchKeysToResolve) {
    const { data: match } = await service
      .from("match_cache")
      .select("*")
      .eq("match_key", matchKey)
      .single();

    if (!match?.is_complete) continue;

    let winningSide: string;
    if (!match.winning_alliance || match.winning_alliance === "") {
      winningSide = "tie";
    } else {
      winningSide = match.winning_alliance;
    }

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
    events: allKeys.length,
    eventsWithMatches,
    fetchErrors,
  });
}
