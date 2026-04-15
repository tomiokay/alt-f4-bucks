"use server";

import { createServiceClient, createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/db/profiles";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }
  return profile;
}

export async function createTestMatch(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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

const RESET_PASSWORD = process.env.RESET_PASSWORD || "altf4reset2026";

export async function resetEverything(formData: FormData) {
  await requireAdmin();
  const service = await createServiceClient();

  const password = formData.get("password") as string;
  if (password !== RESET_PASSWORD) {
    return { error: "Wrong reset password" };
  }

  // Delete all bets, transactions (except welcome bonuses), odds history, notifications, comments
  await service.from("odds_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await service.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await service.from("comments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await service.from("pool_bets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await service.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Re-grant 1000 AF4 to all users
  const { data: profiles } = await service.from("profiles").select("id");
  if (profiles) {
    const bonuses = profiles.map((p) => ({
      type: "award" as const,
      amount: 1000,
      to_user_id: p.id,
      reason: "Welcome bonus — 1,000 AF4 to get started",
      category: "bonus",
    }));
    await service.from("transactions").insert(bonuses);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/betting");
  return { success: true };
}

export async function updateTeamNumber(formData: FormData) {
  await requireAdmin();
  const service = await createServiceClient();

  const userId = formData.get("userId") as string;
  const teamNumber = (formData.get("teamNumber") as string)?.trim() || null;

  const { error } = await service
    .from("profiles")
    .update({ team_number: teamNumber })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/leaderboard");
  return { success: true };
}
