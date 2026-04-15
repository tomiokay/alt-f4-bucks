"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTestMatch(formData: FormData) {
  const service = await createServiceClient();

  const eventName = formData.get("eventName") as string || "Dev Test Event";
  const compLevel = formData.get("compLevel") as string || "qm";
  const matchNumber = parseInt(formData.get("matchNumber") as string) || Math.floor(Math.random() * 100) + 1;
  const redTeams = (formData.get("redTeams") as string || "254,1678,971").split(",").map(t => t.trim());
  const blueTeams = (formData.get("blueTeams") as string || "118,2056,1114").split(",").map(t => t.trim());

  const matchKey = `2026devtest_${compLevel}${matchNumber}`;
  const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // tomorrow

  const { error } = await service.from("match_cache").upsert({
    match_key: matchKey,
    event_key: "2026devtest",
    event_name: eventName,
    comp_level: compLevel,
    match_number: matchNumber,
    red_teams: redTeams,
    blue_teams: blueTeams,
    scheduled_time: scheduledTime,
    actual_time: null,
    red_score: null,
    blue_score: null,
    winning_alliance: null,
    is_complete: false,
    fetched_at: new Date().toISOString(),
  }, { onConflict: "match_key" });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/betting");
  return { success: true, matchKey };
}

export async function resolveTestMatch(formData: FormData) {
  const service = await createServiceClient();

  const matchKey = formData.get("matchKey") as string;
  const winner = formData.get("winner") as string; // "red" or "blue"
  const redScore = parseInt(formData.get("redScore") as string) || 150;
  const blueScore = parseInt(formData.get("blueScore") as string) || 120;

  // Update match as complete
  const { error: updateError } = await service
    .from("match_cache")
    .update({
      red_score: redScore,
      blue_score: blueScore,
      winning_alliance: winner,
      is_complete: true,
      actual_time: new Date().toISOString(),
    })
    .eq("match_key", matchKey);

  if (updateError) return { error: updateError.message };

  // Resolve the pool
  const { data: unresolvedBets } = await service
    .from("pool_bets")
    .select("id, user_id, side, amount")
    .eq("match_key", matchKey)
    .is("payout", null);

  if (unresolvedBets && unresolvedBets.length > 0) {
    const result = { red_score: redScore, blue_score: blueScore, winning_alliance: winner };

    const { data: count } = await service.rpc("resolve_match_pool", {
      p_match_key: matchKey,
      p_winning_side: winner,
      p_result: result,
    });

    // Fetch resolved bets to get payout amounts
    const { data: resolvedBets } = await service
      .from("pool_bets")
      .select("id, user_id, side, amount, payout")
      .eq("match_key", matchKey)
      .in("id", unresolvedBets.map((b) => b.id));

    const notifications = (resolvedBets ?? unresolvedBets).map((bet) => {
      const won = bet.side === winner;
      const payout = (bet as { payout?: number }).payout ?? 0;
      const multiplier = bet.amount > 0 ? (payout / bet.amount).toFixed(1) : "0";
      return {
        user_id: bet.user_id,
        type: won ? "bet_won" : "bet_lost",
        message: won
          ? `You won your $${bet.amount.toLocaleString()} bet on ${bet.side} in ${matchKey}! Paid out $${payout.toLocaleString()} (${multiplier}x)`
          : `You lost your $${bet.amount.toLocaleString()} bet on ${bet.side} in ${matchKey}.`,
        meta: { match_key: matchKey, bet_id: bet.id },
      };
    });

    try {
      await service.from("notifications").insert(notifications);
    } catch {
      // non-critical
    }

    revalidatePath("/");
    revalidatePath("/betting");
    revalidatePath("/dashboard");
    return { success: true, resolved: count ?? 0 };
  }

  revalidatePath("/");
  revalidatePath("/betting");
  return { success: true, resolved: 0 };
}

export async function grantBucks(formData: FormData) {
  const service = await createServiceClient();

  const userId = formData.get("userId") as string;
  const amount = parseInt(formData.get("amount") as string) || 1000;

  const { error } = await service.from("transactions").insert({
    type: "award",
    amount,
    to_user_id: userId,
    reason: `Dev mode: granted ${amount} AF4`,
    category: "bonus",
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}
