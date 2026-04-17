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

// Place a score prediction bet (user predicts red and blue scores)
const scorePredictionSchema = z.object({
  marketId: z.string().uuid("Invalid market"),
  predictedRed: z.coerce.number().int().min(0, "Red score must be positive"),
  predictedBlue: z.coerce.number().int().min(0, "Blue score must be positive"),
  amount: z.coerce.number().int().min(1, "Bet at least 1 Buck"),
});

export async function placeScorePrediction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = scorePredictionSchema.safeParse({
    marketId: formData.get("marketId"),
    predictedRed: formData.get("predictedRed"),
    predictedBlue: formData.get("predictedBlue"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check 5-minute cutoff for score predictions
  const { data: marketData } = await supabase
    .from("prediction_markets")
    .select("match_key")
    .eq("id", parsed.data.marketId)
    .single();

  if (marketData?.match_key) {
    const { data: match } = await supabase
      .from("match_cache")
      .select("scheduled_time, is_complete")
      .eq("match_key", marketData.match_key)
      .single();

    if (match?.is_complete) {
      return { error: "This match has already been played." };
    }
    if (match?.scheduled_time) {
      const cutoff = new Date(match.scheduled_time).getTime() - 5 * 60 * 1000;
      if (Date.now() >= cutoff) {
        return { error: "Predictions close 5 minutes before match time." };
      }
    }
  }

  const { data, error } = await supabase.rpc("place_score_prediction", {
    p_user_id: user.id,
    p_market_id: parsed.data.marketId,
    p_predicted_red: parsed.data.predictedRed,
    p_predicted_blue: parsed.data.predictedBlue,
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

// Helper: check if market already exists (handles NULL match_key)
async function marketExists(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  eventKey: string,
  matchKey: string | null,
  type: string
): Promise<boolean> {
  let query = service
    .from("prediction_markets")
    .select("id")
    .eq("event_key", eventKey)
    .eq("type", type);

  if (matchKey) {
    query = query.eq("match_key", matchKey);
  } else {
    query = query.is("match_key", null);
  }

  const { data } = await query.limit(1);
  return (data?.length ?? 0) > 0;
}

// Create score prediction markets for all upcoming matches in an event
export async function ensureScorePredictions(eventKey: string) {
  const service = await createServiceClient();

  // Get upcoming matches for this event
  const { data: matches } = await service
    .from("match_cache")
    .select("match_key, is_complete")
    .eq("event_key", eventKey)
    .eq("is_complete", false);

  if (!matches || matches.length === 0) return 0;

  let created = 0;
  for (const match of matches) {
    if (await marketExists(service, eventKey, match.match_key, "score_prediction")) continue;

    const { error } = await service.from("prediction_markets").insert({
      event_key: eventKey,
      match_key: match.match_key,
      type: "score_prediction",
      title: `Predict the Score`,
      description: `Predict the Red and Blue alliance scores. Closer to actual = bigger payout.`,
      options: [{ key: "score", label: "Predict Red & Blue scores" }],
      status: "open",
    });

    if (!error) created++;
  }

  return created;
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

  // 1. Score prediction markets for upcoming matches (accuracy-based)
  const upcomingMatches = matches.filter((m) => !m.is_complete);
  for (const match of upcomingMatches) {
    const pred = predictions[match.match_key];
    const hasPred = pred?.redPredScore != null && pred?.bluePredScore != null;

    if (await marketExists(service, eventKey, match.match_key, "score_prediction")) continue;

    await service.from("prediction_markets").insert({
      event_key: eventKey,
      match_key: match.match_key,
      type: "score_prediction",
      title: `Predict the Score`,
      description: hasPred
        ? `Statbotics predicts Red ~${Math.round(pred.redPredScore!)} / Blue ~${Math.round(pred.bluePredScore!)}. Closer to actual scores = bigger payout.`
        : `Predict the Red and Blue alliance scores. Closer to actual = bigger payout.`,
      options: [{ key: "score", label: "Predict Red & Blue scores" }],
      line: hasPred ? Math.round(pred.redPredScore! + pred.bluePredScore!) : null,
      status: "open",
    });
  }

  // 2. Event winner market (if alliances exist) — ONE per event
  if (alliances.length > 0) {
    if (!(await marketExists(service, eventKey, null, "event_winner"))) {
      const options = alliances.map((a, i) => ({
        key: `alliance_${i + 1}`,
        label: `${a.name || `Alliance ${i + 1}`} (${a.picks.map((p) => p.replace("frc", "")).join(", ")})`,
      }));

      await service.from("prediction_markets").insert({
        event_key: eventKey,
        match_key: null,
        type: "event_winner",
        title: "Event Winner",
        description: "Which alliance wins the event?",
        options,
        status: "open",
      });
    }
  }

  // 3. Per-rank prediction markets (Ranks 1-8)
  // Create as soon as we have matches — use rankings if available, otherwise extract teams from matches
  const allQualMatches = matches.filter((m) => m.comp_level === "qm");
  let allTeams: { key: string; label: string }[] = [];

  if (rankings.length > 0) {
    allTeams = rankings.map((r) => ({
      key: r.team_key,
      label: `Team ${r.team_key.replace("frc", "")}`,
    }));
  } else if (matches.length > 0) {
    // Extract unique teams from match data
    const teamSet = new Set<string>();
    for (const m of matches) {
      for (const t of m.red_teams) teamSet.add(t);
      for (const t of m.blue_teams) teamSet.add(t);
    }
    allTeams = [...teamSet].sort().map((t) => ({
      key: t.startsWith("frc") ? t : `frc${t}`,
      label: `Team ${t.replace("frc", "")}`,
    }));
  }

  if (allTeams.length > 0) {

    for (let rank = 1; rank <= 8; rank++) {
      // Use ranking_position type with rank stored in `line`
      const exists = await service
        .from("prediction_markets")
        .select("id")
        .eq("event_key", eventKey)
        .is("match_key", null)
        .eq("type", "ranking_position")
        .eq("line", rank)
        .limit(1);

      if ((exists.data?.length ?? 0) > 0) continue;

      await service.from("prediction_markets").insert({
        event_key: eventKey,
        match_key: null,
        type: "ranking_position",
        title: `Who Finishes Rank #${rank}?`,
        description: `Predict which team finishes #${rank} in qualification rankings`,
        options: allTeams,
        line: rank,
        status: "open",
      });
    }
  }
}

// Resolve score prediction markets for completed matches
export async function resolveScoreMarkets(eventKey: string) {
  const service = await createServiceClient();

  // Resolve score_prediction markets (accuracy-based)
  const { data: scoreMarkets } = await service
    .from("prediction_markets")
    .select("*")
    .eq("event_key", eventKey)
    .eq("type", "score_prediction")
    .eq("status", "open");

  let resolved = 0;

  for (const market of scoreMarkets ?? []) {
    if (!market.match_key) continue;

    const { data: match } = await service
      .from("match_cache")
      .select("red_score, blue_score, is_complete")
      .eq("match_key", market.match_key)
      .single();

    if (!match?.is_complete || match.red_score === null || match.blue_score === null) continue;

    try {
      const { data: count } = await service.rpc("resolve_score_prediction", {
        p_market_id: market.id,
        p_actual_red: match.red_score,
        p_actual_blue: match.blue_score,
      });
      resolved += (count as number) ?? 0;
    } catch {
      // RPC may not exist yet if migration hasn't run
    }
  }

  // Also resolve old score_over_under markets
  const { data: ouMarkets } = await service
    .from("prediction_markets")
    .select("*")
    .eq("event_key", eventKey)
    .eq("type", "score_over_under")
    .eq("status", "open");

  for (const market of ouMarkets ?? []) {
    if (!market.match_key || !market.line) continue;

    const { data: match } = await service
      .from("match_cache")
      .select("red_score, blue_score, is_complete")
      .eq("match_key", market.match_key)
      .single();

    if (!match?.is_complete || match.red_score === null || match.blue_score === null) continue;

    const totalScore = match.red_score + match.blue_score;
    const correctOption = totalScore > market.line ? "over" : "under";

    if (totalScore === market.line) {
      await service.from("prediction_markets")
        .update({ status: "voided", resolved_at: new Date().toISOString() })
        .eq("id", market.id);
      resolved++;
      continue;
    }

    try {
      const { data: count } = await service.rpc("resolve_prediction_market", {
        p_market_id: market.id,
        p_correct_option: correctOption,
      });
      resolved += (count as number) ?? 0;
    } catch { /* skip */ }
  }

  // Resolve event_winner markets if all playoff matches are complete
  const { data: ewMarkets } = await service
    .from("prediction_markets")
    .select("*")
    .eq("event_key", eventKey)
    .eq("type", "event_winner")
    .eq("status", "open");

  for (const market of ewMarkets ?? []) {
    // Check if event has playoff matches and they're all complete
    const { data: playoffMatches } = await service
      .from("match_cache")
      .select("comp_level, is_complete, winning_alliance, red_teams, blue_teams")
      .eq("event_key", eventKey)
      .neq("comp_level", "qm");

    if (!playoffMatches || playoffMatches.length === 0) continue;
    const allDone = playoffMatches.every((m: { is_complete: boolean }) => m.is_complete);
    if (!allDone) continue;

    // Find the finals winner — last finals match with a winner
    const finals = playoffMatches
      .filter((m: { comp_level: string; winning_alliance: string }) => m.comp_level === "f" && m.winning_alliance)
      .pop();

    if (!finals) continue;

    // Try to determine which alliance number won using TBA alliances
    try {
      const { getEventAlliances } = await import("@/lib/tba");
      const alliances = await getEventAlliances(eventKey);
      const winningTeams = (finals as { winning_alliance: string; red_teams: string[]; blue_teams: string[] }).winning_alliance === "red"
        ? (finals as { red_teams: string[] }).red_teams
        : (finals as { blue_teams: string[] }).blue_teams;

      // Find which alliance contains the winning teams
      let winningAllianceKey: string | null = null;
      for (let i = 0; i < alliances.length; i++) {
        const picks = alliances[i].picks.map((p: string) => p.replace("frc", ""));
        if (winningTeams.some((t: string) => picks.includes(t))) {
          winningAllianceKey = `alliance_${i + 1}`;
          break;
        }
      }

      if (winningAllianceKey) {
        await service.rpc("resolve_prediction_market", {
          p_market_id: market.id,
          p_correct_option: winningAllianceKey,
        });
        resolved++;
      }
    } catch {
      // TBA call failed, skip
    }
  }

  // Resolve ranking_position markets if quals are done
  const { data: rankMarkets } = await service
    .from("prediction_markets")
    .select("*")
    .eq("event_key", eventKey)
    .eq("type", "ranking_position")
    .eq("status", "open");

  if (rankMarkets && rankMarkets.length > 0) {
    // Check if quals are done (no upcoming qual matches)
    const { data: qualMatches } = await service
      .from("match_cache")
      .select("is_complete")
      .eq("event_key", eventKey)
      .eq("comp_level", "qm");

    const allQualsDone = qualMatches && qualMatches.length > 0 && qualMatches.every((m: { is_complete: boolean }) => m.is_complete);

    if (allQualsDone) {
      try {
        const { getEventRankings } = await import("@/lib/tba");
        const rankings = await getEventRankings(eventKey);

        for (const market of rankMarkets) {
          const targetRank = market.line ? Math.round(market.line) : null;
          if (!targetRank) continue;

          const teamAtRank = rankings.find((r: { rank: number }) => r.rank === targetRank);
          if (!teamAtRank) continue;

          await service.rpc("resolve_prediction_market", {
            p_market_id: market.id,
            p_correct_option: teamAtRank.team_key,
          });
          resolved++;
        }
      } catch {
        // TBA call failed, skip
      }
    }
  }

  // Send payout notifications for all prediction bets that were just resolved
  if (resolved > 0) {
    await sendPredictionPayoutNotifications(service, eventKey);
  }

  return resolved;
}

async function sendPredictionPayoutNotifications(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  eventKey: string
) {
  try {
    // Find recently resolved prediction markets for this event
    const { data: resolvedMarkets } = await service
      .from("prediction_markets")
      .select("id, title")
      .eq("event_key", eventKey)
      .eq("status", "resolved");

    if (!resolvedMarkets || resolvedMarkets.length === 0) return;

    const marketIds = resolvedMarkets.map((m) => m.id);
    const marketTitles: Record<string, string> = {};
    for (const m of resolvedMarkets) marketTitles[m.id] = m.title;

    // Find bets on these markets that have payouts but no notification yet
    const { data: resolvedBets } = await service
      .from("prediction_bets")
      .select("id, user_id, market_id, amount, payout")
      .in("market_id", marketIds)
      .not("payout", "is", null);

    if (!resolvedBets || resolvedBets.length === 0) return;

    // Check which bets already have notifications
    const betIds = resolvedBets.map((b) => b.id);
    const { data: existingNotifs } = await service
      .from("notifications")
      .select("meta")
      .in("meta->>prediction_bet_id", betIds);

    const notifiedBetIds = new Set(
      (existingNotifs ?? []).map((n) => (n.meta as Record<string, string>)?.prediction_bet_id)
    );

    const newNotifications = resolvedBets
      .filter((b) => !notifiedBetIds.has(b.id))
      .map((bet) => {
        const won = bet.payout > 0;
        const title = marketTitles[bet.market_id] ?? "prediction market";
        return {
          user_id: bet.user_id,
          type: won ? "bet_won" : "bet_lost",
          message: won
            ? `You won $${bet.payout.toLocaleString()} on "${title}"!`
            : `You lost your $${bet.amount.toLocaleString()} bet on "${title}".`,
          meta: { prediction_bet_id: bet.id, market_id: bet.market_id },
        };
      });

    if (newNotifications.length > 0) {
      await service.from("notifications").insert(newNotifications);
    }
  } catch {
    // non-critical
  }
}
