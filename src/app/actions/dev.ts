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

export async function createTestEvent(formData: FormData) {
  await requireAdmin();
  const service = await createServiceClient();

  const eventName = formData.get("eventName") as string || "Dev Test Regional";
  const numMatches = parseInt(formData.get("numMatches") as string) || 12;
  const eventKey = `2026devtest_${Date.now().toString(36)}`;

  // Pool of FRC teams to randomly assign
  const teamPool = [
    "254","971","1678","118","2056","1114","148","330","1323","2910",
    "3310","4414","7558","846","687","696","980","1622","4738","7607",
    "2659","2073","2637","5012","3863","2404","3749","2543","8768","9706",
  ];

  const matches = [];
  for (let i = 1; i <= numMatches; i++) {
    // Shuffle and pick 6 random teams (3 red, 3 blue)
    const shuffled = [...teamPool].sort(() => Math.random() - 0.5);
    const red = shuffled.slice(0, 3);
    const blue = shuffled.slice(3, 6);

    // Schedule matches spread over the next 2 days
    const hoursOffset = 24 + (i * 0.5);
    const scheduledTime = new Date(Date.now() + hoursOffset * 60 * 60 * 1000).toISOString();

    matches.push({
      match_key: `${eventKey}_qm${i}`,
      event_key: eventKey,
      event_name: eventName,
      comp_level: "qm",
      match_number: i,
      red_teams: red,
      blue_teams: blue,
      scheduled_time: scheduledTime,
      actual_time: null,
      red_score: null,
      blue_score: null,
      winning_alliance: null,
      is_complete: false,
      fetched_at: new Date().toISOString(),
    });
  }

  const { error } = await service.from("match_cache").upsert(matches, { onConflict: "match_key" });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/betting");
  revalidatePath("/events");
  return { success: true, eventKey, matchCount: numMatches };
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

  // Re-grant 10,000 AF4 to all users
  const { data: profiles } = await service.from("profiles").select("id");
  if (profiles) {
    const bonuses = profiles.map((p) => ({
      type: "award" as const,
      amount: 10000,
      to_user_id: p.id,
      reason: "Welcome bonus — 10,000 AF4 to get started",
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

export async function createTestRankingsAndAlliances(formData: FormData) {
  await requireAdmin();
  const service = await createServiceClient();

  const eventKey = formData.get("eventKey") as string;
  if (!eventKey) return { error: "Event key required" };

  // Get all teams from this event's matches
  const { data: matches } = await service
    .from("match_cache")
    .select("red_teams, blue_teams")
    .eq("event_key", eventKey);

  if (!matches || matches.length === 0) return { error: "No matches found for this event" };

  const teamSet = new Set<string>();
  for (const m of matches) {
    for (const t of m.red_teams) teamSet.add(t);
    for (const t of m.blue_teams) teamSet.add(t);
  }
  const teams = [...teamSet];

  // Shuffle teams for random rankings
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Build fake rankings
  const rankings = shuffled.map((team, i) => ({
    team_key: team.startsWith("frc") ? team : `frc${team}`,
    rank: i + 1,
  }));

  // Build 8 alliances from top 8 teams (each picks 3 total)
  const alliances = [];
  for (let i = 0; i < Math.min(8, Math.floor(shuffled.length / 3)); i++) {
    const captain = shuffled[i];
    // Pick 2 more teams that aren't already captains
    const available = shuffled.filter((t, idx) => idx >= 8 || idx === i);
    const pick1 = shuffled[8 + i * 2] ?? shuffled[shuffled.length - 1 - i];
    const pick2 = shuffled[8 + i * 2 + 1] ?? shuffled[shuffled.length - 2 - i];

    alliances.push({
      name: `Alliance ${i + 1}`,
      picks: [
        captain.startsWith("frc") ? captain : `frc${captain}`,
        (pick1 ?? captain).startsWith("frc") ? pick1 ?? captain : `frc${pick1 ?? captain}`,
        (pick2 ?? captain).startsWith("frc") ? pick2 ?? captain : `frc${pick2 ?? captain}`,
      ],
    });
  }

  // Now trigger ensureEventMarkets with this fake data
  const { ensureEventMarkets } = await import("@/app/actions/predictions");
  const matchData = (matches as { red_teams: string[]; blue_teams: string[] }[]).map((m, i) => ({
    match_key: `${eventKey}_qm${i + 1}`,
    comp_level: "qm" as const,
    is_complete: false,
    red_teams: m.red_teams,
    blue_teams: m.blue_teams,
    red_score: null,
    blue_score: null,
  }));

  // Get actual match data from the cache
  const { data: fullMatches } = await service
    .from("match_cache")
    .select("match_key, comp_level, is_complete, red_teams, blue_teams, red_score, blue_score")
    .eq("event_key", eventKey);

  await ensureEventMarkets(
    eventKey,
    fullMatches ?? matchData,
    {},
    rankings,
    alliances
  );

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/betting");
  return {
    success: true,
    teamCount: teams.length,
    allianceCount: alliances.length,
    rankingCount: rankings.length,
  };
}

export async function createTestPlayoffMatches(formData: FormData) {
  await requireAdmin();
  const service = await createServiceClient();

  const eventKey = formData.get("eventKey") as string;
  if (!eventKey) return { error: "Event key required" };

  // Get event name from existing matches
  const { data: existingMatch } = await service
    .from("match_cache")
    .select("event_name")
    .eq("event_key", eventKey)
    .limit(1)
    .single();

  const eventName = existingMatch?.event_name ?? "Dev Test Event";

  // Get all teams to build alliances
  const { data: matches } = await service
    .from("match_cache")
    .select("red_teams, blue_teams")
    .eq("event_key", eventKey);

  if (!matches || matches.length === 0) return { error: "No matches found" };

  const teamSet = new Set<string>();
  for (const m of matches) {
    for (const t of m.red_teams) teamSet.add(t);
    for (const t of m.blue_teams) teamSet.add(t);
  }
  const teams = [...teamSet].sort(() => Math.random() - 0.5);

  // Build 8 alliances of 3 teams
  const alliances: string[][] = [];
  for (let i = 0; i < Math.min(8, Math.floor(teams.length / 3)); i++) {
    alliances.push(teams.slice(i * 3, i * 3 + 3));
  }

  if (alliances.length < 2) return { error: "Not enough teams for playoffs" };

  // Create semifinal matches (sf1-1 through sf2-3) and final matches (f1-1 through f1-3)
  const playoffMatches = [];
  const baseTime = Date.now() + 48 * 60 * 60 * 1000; // 2 days from now

  // Semifinals: Alliance 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
  const sfMatchups = [
    [0, Math.min(7, alliances.length - 1)],
    [1, Math.min(6, alliances.length - 1)],
    [Math.min(2, alliances.length - 1), Math.min(5, alliances.length - 1)],
    [Math.min(3, alliances.length - 1), Math.min(4, alliances.length - 1)],
  ];

  let matchIdx = 0;
  for (let sf = 0; sf < Math.min(4, Math.floor(alliances.length / 2)); sf++) {
    const [redIdx, blueIdx] = sfMatchups[sf];
    for (let game = 1; game <= 3; game++) {
      matchIdx++;
      playoffMatches.push({
        match_key: `${eventKey}_sf${sf + 1}m${game}`,
        event_key: eventKey,
        event_name: eventName,
        comp_level: "sf",
        match_number: sf * 3 + game,
        red_teams: alliances[redIdx],
        blue_teams: alliances[blueIdx],
        scheduled_time: new Date(baseTime + matchIdx * 30 * 60 * 1000).toISOString(),
        actual_time: null,
        red_score: null,
        blue_score: null,
        winning_alliance: null,
        is_complete: false,
        fetched_at: new Date().toISOString(),
      });
    }
  }

  // Finals: 3 matches
  for (let game = 1; game <= 3; game++) {
    matchIdx++;
    playoffMatches.push({
      match_key: `${eventKey}_f1m${game}`,
      event_key: eventKey,
      event_name: eventName,
      comp_level: "f",
      match_number: game,
      red_teams: alliances[0],
      blue_teams: alliances[1],
      scheduled_time: new Date(baseTime + matchIdx * 30 * 60 * 1000).toISOString(),
      actual_time: null,
      red_score: null,
      blue_score: null,
      winning_alliance: null,
      is_complete: false,
      fetched_at: new Date().toISOString(),
    });
  }

  const { error } = await service.from("match_cache").upsert(playoffMatches, { onConflict: "match_key" });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/betting");
  revalidatePath("/events");
  return { success: true, matchCount: playoffMatches.length, allianceCount: alliances.length };
}

export async function resolveTestPredictionMarket(formData: FormData) {
  await requireAdmin();
  const service = await createServiceClient();

  const marketId = formData.get("marketId") as string;
  const correctOption = formData.get("correctOption") as string;

  if (!marketId || !correctOption) return { error: "Market ID and correct option required" };

  try {
    const { data: count } = await service.rpc("resolve_prediction_market", {
      p_market_id: marketId,
      p_correct_option: correctOption,
    });

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true, resolved: count ?? 0 };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to resolve" };
  }
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
