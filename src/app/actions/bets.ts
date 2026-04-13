"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getEventMatches,
  getCurrentEvents,
  tbaMatchToCache,
} from "@/lib/tba";

const poolBetSchema = z.object({
  matchKey: z.string().min(1, "Match is required"),
  side: z.enum(["red", "blue"], { error: "Pick red or blue" }),
  amount: z.coerce.number().int().min(1, "Bet at least 1 Buck"),
});

export async function placePoolBet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = poolBetSchema.safeParse({
    matchKey: formData.get("matchKey"),
    side: formData.get("side"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase.rpc("place_pool_bet", {
    p_user_id: user.id,
    p_match_key: parsed.data.matchKey,
    p_side: parsed.data.side,
    p_amount: parsed.data.amount,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Insufficient balance")) {
      return { error: "You don't have enough Alt-F4 Bucks." };
    }
    if (msg.includes("already been played")) {
      return { error: "This match has already been played." };
    }
    if (msg.includes("closed")) {
      return { error: "Betting is closed for this match." };
    }
    return { error: msg };
  }

  revalidatePath("/betting");
  revalidatePath("/dashboard");
  return { success: true, betId: data };
}

export async function syncEventMatches(eventKey: string) {
  const service = await createServiceClient();

  const events = await getCurrentEvents();
  const event = events.find((e) => e.key === eventKey);
  const eventName = event?.name ?? eventKey;

  const matches = await getEventMatches(eventKey);
  const rows = matches.map((m) => tbaMatchToCache(m, eventName));

  const { error } = await service.from("match_cache").upsert(rows, {
    onConflict: "match_key",
  });

  if (error) return { error: error.message };

  revalidatePath("/betting");
  return { success: true, count: rows.length };
}

export async function resolveCompletedPools() {
  const service = await createServiceClient();

  // Find matches that are complete and have unresolved bets
  const { data: unresolvedMatches } = await service
    .from("pool_bets")
    .select("match_key")
    .is("payout", null);

  if (!unresolvedMatches || unresolvedMatches.length === 0) return { resolved: 0 };

  const matchKeys = [...new Set(unresolvedMatches.map((b) => b.match_key))];
  let totalResolved = 0;

  for (const matchKey of matchKeys) {
    // Check if match is complete
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
      winningSide = match.winning_alliance; // "red" or "blue"
    }

    const result = {
      red_score: match.red_score,
      blue_score: match.blue_score,
      winning_alliance: match.winning_alliance,
    };

    const { data: count } = await service.rpc("resolve_match_pool", {
      p_match_key: matchKey,
      p_winning_side: winningSide,
      p_result: result,
    });

    totalResolved += (count as number) ?? 0;
  }

  revalidatePath("/betting");
  revalidatePath("/dashboard");
  return { resolved: totalResolved };
}
