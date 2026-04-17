import { createClient } from "@/lib/supabase/server";
import type { PredictionMarket, PredictionBet, PredictionPoolOption } from "@/lib/types";

export async function getEventPredictionMarkets(eventKey: string): Promise<PredictionMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_markets")
    .select("*")
    .eq("event_key", eventKey)
    .order("created_at", { ascending: true });

  return (data ?? []) as PredictionMarket[];
}

export async function getMatchPredictionMarkets(matchKey: string): Promise<PredictionMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_markets")
    .select("*")
    .eq("match_key", matchKey)
    .order("created_at", { ascending: true });

  return (data ?? []) as PredictionMarket[];
}

export async function getPredictionMarket(marketId: string): Promise<PredictionMarket | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_markets")
    .select("*")
    .eq("id", marketId)
    .single();

  return data as PredictionMarket | null;
}

export async function getPredictionPoolSummary(marketId: string): Promise<Map<string, PredictionPoolOption>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_pool_summary")
    .select("*")
    .eq("market_id", marketId);

  const map = new Map<string, PredictionPoolOption>();
  for (const row of (data ?? []) as PredictionPoolOption[]) {
    map.set(row.option_key, row);
  }
  return map;
}

export async function getAllPredictionPools(eventKey: string): Promise<Map<string, Map<string, PredictionPoolOption>>> {
  const supabase = await createClient();

  // Get all market IDs for this event
  const { data: markets } = await supabase
    .from("prediction_markets")
    .select("id")
    .eq("event_key", eventKey);

  const marketIds = (markets ?? []).map((m: { id: string }) => m.id);
  if (marketIds.length === 0) return new Map();

  const { data } = await supabase
    .from("prediction_pool_summary")
    .select("*")
    .in("market_id", marketIds);

  const map = new Map<string, Map<string, PredictionPoolOption>>();
  for (const row of (data ?? []) as PredictionPoolOption[]) {
    if (!map.has(row.market_id)) map.set(row.market_id, new Map());
    map.get(row.market_id)!.set(row.option_key, row);
  }
  return map;
}

export async function getAllCustomMarkets(): Promise<PredictionMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_markets")
    .select("*")
    .eq("is_custom", true)
    .order("created_at", { ascending: false });

  return (data ?? []) as PredictionMarket[];
}

export async function getFeaturedCustomMarkets(): Promise<PredictionMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_markets")
    .select("*")
    .eq("is_custom", true)
    .eq("featured", true)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (data ?? []) as PredictionMarket[];
}

export async function getAllOpenPredictionMarkets(): Promise<PredictionMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_markets")
    .select("*")
    .in("status", ["open", "closed"])
    .order("created_at", { ascending: false });

  return (data ?? []) as PredictionMarket[];
}

export async function getRecentlyResolvedPredictionMarkets(limit = 20): Promise<PredictionMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_markets")
    .select("*")
    .eq("status", "resolved")
    .order("resolved_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as PredictionMarket[];
}

export async function getAllPredictionPoolSummaries(): Promise<Map<string, Map<string, PredictionPoolOption>>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prediction_pool_summary")
    .select("*");

  const map = new Map<string, Map<string, PredictionPoolOption>>();
  for (const row of (data ?? []) as PredictionPoolOption[]) {
    if (!map.has(row.market_id)) map.set(row.market_id, new Map());
    map.get(row.market_id)!.set(row.option_key, row);
  }
  return map;
}

export type PredictionBetWithMarket = PredictionBet & {
  market_title: string;
  market_type: string;
  option_label: string;
};

export async function getUserPredictionBets(userId: string): Promise<PredictionBetWithMarket[]> {
  const supabase = await createClient();
  const { data: bets } = await supabase
    .from("prediction_bets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!bets || bets.length === 0) return [];

  // Fetch market info for all bets
  const marketIds = [...new Set((bets as PredictionBet[]).map((b) => b.market_id))];
  const { data: markets } = await supabase
    .from("prediction_markets")
    .select("id, title, type, options")
    .in("id", marketIds);

  const marketMap = new Map<string, { title: string; type: string; options: { key: string; label: string }[] }>();
  for (const m of (markets ?? []) as { id: string; title: string; type: string; options: { key: string; label: string }[] }[]) {
    marketMap.set(m.id, { title: m.title, type: m.type, options: m.options });
  }

  return (bets as PredictionBet[]).map((bet) => {
    const market = marketMap.get(bet.market_id);
    const optionLabel = market?.options.find((o) => o.key === bet.option_key)?.label ?? bet.option_key;
    return {
      ...bet,
      market_title: market?.title ?? "Unknown Market",
      market_type: market?.type ?? "custom",
      option_label: optionLabel,
    };
  });
}
