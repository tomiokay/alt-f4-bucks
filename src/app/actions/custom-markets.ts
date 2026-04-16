"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/db/profiles";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }
  return profile;
}

export async function createCustomMarket(formData: FormData) {
  await requireAdmin();
  const service = await createServiceClient();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const optionsRaw = (formData.get("options") as string)?.trim();
  const eventKey = (formData.get("eventKey") as string)?.trim() || "custom";

  if (!title) return { error: "Title is required" };
  if (!optionsRaw) return { error: "Options are required" };

  // Parse options: comma-separated
  const optionLabels = optionsRaw.split(",").map((o) => o.trim()).filter(Boolean);
  if (optionLabels.length < 2) return { error: "Need at least 2 options" };

  const options = optionLabels.map((label, i) => ({
    key: `option_${i + 1}`,
    label,
  }));

  const { error } = await service.from("prediction_markets").insert({
    event_key: eventKey,
    match_key: null,
    type: "custom",
    title,
    description,
    options,
    status: "open",
    is_custom: true,
    featured: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/betting");
  return { success: true };
}

export async function getOpenCustomMarkets() {
  const service = await createServiceClient();
  const { data } = await service
    .from("prediction_markets")
    .select("id, title, status, options, correct_option, is_custom, featured")
    .in("status", ["open", "closed"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as {
    id: string;
    title: string;
    status: string;
    options: { key: string; label: string }[];
    correct_option: string | null;
    is_custom: boolean;
    featured: boolean;
  }[];
}

export async function resolveCustomMarket(marketId: string, correctOption: string) {
  await requireAdmin();
  const service = await createServiceClient();

  try {
    const { data: count } = await service.rpc("resolve_prediction_market", {
      p_market_id: marketId,
      p_correct_option: correctOption,
    });

    // Send notifications
    const { data: resolvedBets } = await service
      .from("prediction_bets")
      .select("id, user_id, amount, payout, option_key")
      .eq("market_id", marketId)
      .not("payout", "is", null);

    const { data: market } = await service
      .from("prediction_markets")
      .select("title")
      .eq("id", marketId)
      .single();

    if (resolvedBets && resolvedBets.length > 0) {
      const notifications = resolvedBets.map((bet) => ({
        user_id: bet.user_id,
        type: bet.payout > 0 ? "bet_won" : "bet_lost",
        message: bet.payout > 0
          ? `You won $${bet.payout.toLocaleString()} on "${market?.title ?? "market"}"!`
          : `You lost your $${bet.amount.toLocaleString()} bet on "${market?.title ?? "market"}".`,
        meta: { prediction_bet_id: bet.id, market_id: marketId },
      }));
      await service.from("notifications").insert(notifications);
    }

    revalidatePath("/");
    revalidatePath("/betting");
    return { success: true, resolved: count ?? 0 };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to resolve" };
  }
}

export async function toggleFeatured(marketId: string) {
  await requireAdmin();
  const service = await createServiceClient();

  const { data: market } = await service
    .from("prediction_markets")
    .select("featured")
    .eq("id", marketId)
    .single();

  if (!market) return { error: "Market not found" };

  const { error } = await service
    .from("prediction_markets")
    .update({ featured: !market.featured })
    .eq("id", marketId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/betting");
  return { success: true, featured: !market.featured };
}

export async function voidCustomMarket(marketId: string) {
  await requireAdmin();
  const service = await createServiceClient();

  // Void the market — refund all bets
  const { error } = await service
    .from("prediction_markets")
    .update({ status: "voided", resolved_at: new Date().toISOString() })
    .eq("id", marketId);

  if (error) return { error: error.message };

  // Refund all bets
  const { data: bets } = await service
    .from("prediction_bets")
    .select("id, user_id, amount")
    .eq("market_id", marketId)
    .is("payout", null);

  if (bets && bets.length > 0) {
    for (const bet of bets) {
      await service.from("prediction_bets").update({ payout: bet.amount }).eq("id", bet.id);
      await service.from("transactions").insert({
        type: "adjustment",
        amount: bet.amount,
        to_user_id: bet.user_id,
        reason: "Market voided — bet refunded",
        category: "bet_refund",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/betting");
  return { success: true };
}
