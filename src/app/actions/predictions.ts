"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const predictionBetSchema = z.object({
  marketId: z.string().uuid("Invalid market"),
  option: z.string().min(1, "Pick an option"),
  amount: z.coerce.number().int().min(1, "Bet at least 1 Buck"),
});

export async function placePredictionBet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = predictionBetSchema.safeParse({
    marketId: formData.get("marketId"),
    option: formData.get("option"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase.rpc("place_prediction_bet", {
    p_user_id: user.id,
    p_market_id: parsed.data.marketId,
    p_option: parsed.data.option,
    p_amount: parsed.data.amount,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Insufficient balance")) {
      return { error: "You don't have enough Alt-F4 Bucks." };
    }
    if (msg.includes("closed")) {
      return { error: "This market is closed." };
    }
    return { error: msg };
  }

  revalidatePath("/events");
  revalidatePath("/betting");
  revalidatePath("/dashboard");
  return { success: true, betId: data };
}

// Auto-create prediction markets for an event
export async function ensureEventMarkets(
  eventKey: string,
  matches: {
    match_key: string;
    comp_level: string;
    is_complete: boolean;
    red_teams: string[];
    blue_teams: string[];
    red_score: number | null;
    blue_score: number | null;
  }[],
  predictions: Record<string, { redPredScore?: number; bluePredScore?: number }>,
  rankings: { team_key: string; rank: number }[],
  alliances: { name: string; picks: string[] }[]
) {
  const service = await createServiceClient();

  // 1. Score over/under markets for upcoming qual matches
  const qualMatches = matches.filter((m) => m.comp_level === "qm" && !m.is_complete);
  for (const match of qualMatches) {
    const pred = predictions[match.match_key];
    if (!pred?.redPredScore || !pred?.bluePredScore) continue;

    const totalPredScore = pred.redPredScore + pred.bluePredScore;
    const line = Math.round(totalPredScore);

    await service.from("prediction_markets").upsert(
      {
        event_key: eventKey,
        match_key: match.match_key,
        type: "score_over_under",
        title: `${match.match_key.split("_").pop()}: Total Score O/U ${line}`,
        description: `Will the combined score be over or under ${line}?`,
        options: [
          { key: "over", label: `Over ${line}` },
          { key: "under", label: `Under ${line}` },
        ],
        line,
        status: "open",
      },
      { onConflict: "event_key,match_key,type" }
    );
  }

  // Also create score O/U for playoff matches
  const playoffMatches = matches.filter((m) => m.comp_level !== "qm" && !m.is_complete);
  for (const match of playoffMatches) {
    const pred = predictions[match.match_key];
    if (!pred?.redPredScore || !pred?.bluePredScore) continue;

    const totalPredScore = pred.redPredScore + pred.bluePredScore;
    const line = Math.round(totalPredScore);

    await service.from("prediction_markets").upsert(
      {
        event_key: eventKey,
        match_key: match.match_key,
        type: "score_over_under",
        title: `${match.match_key.split("_").pop()}: Total Score O/U ${line}`,
        description: `Will the combined score be over or under ${line}?`,
        options: [
          { key: "over", label: `Over ${line}` },
          { key: "under", label: `Under ${line}` },
        ],
        line,
        status: "open",
      },
      { onConflict: "event_key,match_key,type" }
    );
  }

  // 2. Event winner market (if alliances exist)
  if (alliances.length > 0) {
    const options = alliances.map((a, i) => ({
      key: `alliance_${i + 1}`,
      label: `${a.name || `Alliance ${i + 1}`} (${a.picks.map((p) => p.replace("frc", "")).join(", ")})`,
    }));

    await service.from("prediction_markets").upsert(
      {
        event_key: eventKey,
        match_key: null,
        type: "event_winner",
        title: "Event Winner",
        description: "Which alliance wins the event?",
        options,
        status: "open",
      },
      { onConflict: "event_key,match_key,type" }
    );
  }

  // 3. Ranking #1 market (if rankings exist and event is still going)
  if (rankings.length > 0 && qualMatches.length > 0) {
    const topTeams = rankings.slice(0, 20);
    const options = topTeams.map((r) => ({
      key: r.team_key,
      label: `Team ${r.team_key.replace("frc", "")} (currently #${r.rank})`,
    }));

    await service.from("prediction_markets").upsert(
      {
        event_key: eventKey,
        match_key: null,
        type: "ranking_top1",
        title: "Qualification Champion",
        description: "Which team finishes #1 in qualification rankings?",
        options,
        status: "open",
      },
      { onConflict: "event_key,match_key,type" }
    );
  }
}

// Resolve score over/under markets for completed matches
export async function resolveScoreMarkets(eventKey: string) {
  const service = await createServiceClient();

  const { data: markets } = await service
    .from("prediction_markets")
    .select("*")
    .eq("event_key", eventKey)
    .eq("type", "score_over_under")
    .eq("status", "open");

  if (!markets || markets.length === 0) return 0;

  let resolved = 0;

  for (const market of markets) {
    if (!market.match_key || !market.line) continue;

    // Check if match is complete
    const { data: match } = await service
      .from("match_cache")
      .select("red_score, blue_score, is_complete")
      .eq("match_key", market.match_key)
      .single();

    if (!match?.is_complete || match.red_score === null || match.blue_score === null) continue;

    const totalScore = match.red_score + match.blue_score;
    const correctOption = totalScore > market.line ? "over" : "under";

    // If exactly on the line, void the market (refund)
    if (totalScore === market.line) {
      // Refund all bets
      const { data: bets } = await service
        .from("prediction_bets")
        .select("*")
        .eq("market_id", market.id)
        .is("payout", null);

      for (const bet of bets ?? []) {
        await service.from("prediction_bets").update({ payout: bet.amount }).eq("id", bet.id);
        await service.from("transactions").insert({
          type: "adjustment",
          amount: bet.amount,
          to_user_id: bet.user_id,
          by_user_id: bet.user_id,
          reason: `Prediction refund (push) — ${market.title}`,
          category: "prediction_refund",
          meta: { prediction_bet_id: bet.id, market_id: market.id },
        });
      }
      await service
        .from("prediction_markets")
        .update({ status: "voided", resolved_at: new Date().toISOString() })
        .eq("id", market.id);
      resolved++;
      continue;
    }

    const { data: count } = await service.rpc("resolve_prediction_market", {
      p_market_id: market.id,
      p_correct_option: correctOption,
    });

    resolved += (count as number) ?? 0;
  }

  return resolved;
}
