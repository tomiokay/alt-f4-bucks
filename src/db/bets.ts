import { createClient } from "@/lib/supabase/server";
import type { PoolBetWithProfile, MatchCache, PoolSummary, CommentWithProfile, OddsHistoryPoint } from "@/lib/types";

// --- Pool Bets ---

export async function getUserPoolBets(userId: string): Promise<PoolBetWithProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pool_bets")
    .select(`
      *,
      user:profiles!pool_bets_user_id_fkey(display_name)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []) as PoolBetWithProfile[];
}

export async function getMatchPoolBets(matchKey: string): Promise<PoolBetWithProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pool_bets")
    .select(`
      *,
      user:profiles!pool_bets_user_id_fkey(display_name)
    `)
    .eq("match_key", matchKey)
    .order("amount", { ascending: false });

  return (data ?? []) as PoolBetWithProfile[];
}

export async function getPoolSummary(matchKey: string): Promise<PoolSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_pool_summary")
    .select("*")
    .eq("match_key", matchKey)
    .single();

  return data as PoolSummary | null;
}

export async function getAllPoolSummaries(): Promise<Map<string, PoolSummary>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_pool_summary")
    .select("*");

  const map = new Map<string, PoolSummary>();
  for (const row of (data ?? []) as PoolSummary[]) {
    map.set(row.match_key, row);
  }
  return map;
}

// --- Match Cache ---

export async function getCachedMatches(eventKey: string): Promise<MatchCache[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_cache")
    .select("*")
    .eq("event_key", eventKey)
    .order("scheduled_time", { ascending: true })
    .limit(500);

  return (data ?? []) as MatchCache[];
}

export async function getUpcomingMatches(limit = 50): Promise<MatchCache[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_cache")
    .select("*")
    .eq("is_complete", false)
    .order("scheduled_time", { ascending: true })
    .limit(limit);

  return (data ?? []) as MatchCache[];
}

export async function getMatchByKey(matchKey: string): Promise<MatchCache | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_cache")
    .select("*")
    .eq("match_key", matchKey)
    .single();

  return data as MatchCache | null;
}

export async function getActiveEventKeys(): Promise<string[]> {
  const supabase = await createClient();
  // Use a minimal select with distinct-like behavior via group
  const { data } = await supabase
    .from("match_cache")
    .select("event_key")
    .limit(1000);

  const keys = new Set((data ?? []).map((d: { event_key: string }) => d.event_key));
  return Array.from(keys);
}

export async function getAllCachedMatches(): Promise<MatchCache[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_cache")
    .select("*")
    .order("scheduled_time", { ascending: true })
    .limit(2000);

  return (data ?? []) as MatchCache[];
}

export async function getEventList(): Promise<{ key: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_cache")
    .select("event_key, event_name")
    .limit(10000);

  const map = new Map<string, string>();
  for (const d of (data ?? []) as { event_key: string; event_name: string }[]) {
    if (!map.has(d.event_key)) map.set(d.event_key, d.event_name);
  }
  return Array.from(map.entries()).map(([key, name]) => ({ key, name }));
}

// --- Search matches ---

// Common FRC abbreviations and expansions
const SEARCH_ALIASES: Record<string, string[]> = {
  "quals": ["qm"],
  "qual": ["qm"],
  "semis": ["sf"],
  "semi": ["sf"],
  "finals": ["f"],
  "final": ["f"],
  "elims": ["sf", "f"],
  "playoffs": ["sf", "f"],
  "champs": ["championship"],
  "worlds": ["championship"],
  "dcmp": ["district championship"],
  "regionals": ["regional"],
};

export async function searchMatches(query: string, limit = 100): Promise<MatchCache[]> {
  const supabase = await createClient();
  const q = query.toLowerCase().trim();

  // Expand aliases
  const aliases = SEARCH_ALIASES[q] ?? [];

  // Sanitize: remove characters that could break PostgREST filters
  const sanitize = (s: string) => s.replace(/[%(),.*]/g, "");

  const searchTerms = [q, ...aliases].map(sanitize).filter(Boolean);

  let results: MatchCache[] = [];

  for (const term of searchTerms) {
    // Use separate ilike calls to avoid filter injection
    const { data: nameData } = await supabase
      .from("match_cache")
      .select("*")
      .ilike("event_name", `%${term}%`)
      .order("scheduled_time", { ascending: true })
      .limit(limit);

    const { data: keyData } = await supabase
      .from("match_cache")
      .select("*")
      .ilike("match_key", `%${term}%`)
      .order("scheduled_time", { ascending: true })
      .limit(limit);

    if (nameData) results.push(...(nameData as MatchCache[]));
    if (keyData) results.push(...(keyData as MatchCache[]));
  }

  // Also try comp_level filter if query matches
  if (["qm", "sf", "f"].includes(q) || aliases.some(a => ["qm", "sf", "f"].includes(a))) {
    const compLevels = aliases.length > 0 ? aliases.filter(a => ["qm", "sf", "f"].includes(a)) : [q];
    for (const cl of compLevels) {
      const { data } = await supabase
        .from("match_cache")
        .select("*")
        .eq("comp_level", cl)
        .order("scheduled_time", { ascending: true })
        .limit(limit);

      if (data) results.push(...(data as MatchCache[]));
    }
  }

  // If still no results, try team number search
  if (results.length === 0) {
    const { data: allData } = await supabase
      .from("match_cache")
      .select("*")
      .order("scheduled_time", { ascending: true })
      .limit(10000);

    results = ((allData ?? []) as MatchCache[]).filter((m) =>
      m.red_teams.some((t) => t.includes(q)) ||
      m.blue_teams.some((t) => t.includes(q))
    ).slice(0, limit);
  }

  // Deduplicate by match_key
  const seen = new Set<string>();
  return results.filter((m) => {
    if (seen.has(m.match_key)) return false;
    seen.add(m.match_key);
    return true;
  }).slice(0, limit);
}

// --- Related matches (same event, excluding current) ---

export async function getRelatedMatches(eventKey: string, excludeKey: string, limit = 5): Promise<MatchCache[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_cache")
    .select("*")
    .eq("event_key", eventKey)
    .neq("match_key", excludeKey)
    .eq("is_complete", false)
    .order("scheduled_time", { ascending: true })
    .limit(limit);

  return (data ?? []) as MatchCache[];
}

// --- Comments ---

export async function getMatchComments(matchKey: string): Promise<CommentWithProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(`
      *,
      user:profiles!comments_user_id_fkey(display_name)
    `)
    .eq("match_key", matchKey)
    .order("created_at", { ascending: false });

  const all = (data ?? []) as CommentWithProfile[];

  const topLevel: CommentWithProfile[] = [];
  const byParent = new Map<string, CommentWithProfile[]>();

  for (const c of all) {
    if (c.parent_id) {
      const existing = byParent.get(c.parent_id) ?? [];
      existing.push(c);
      byParent.set(c.parent_id, existing);
    } else {
      topLevel.push(c);
    }
  }

  for (const c of topLevel) {
    c.replies = byParent.get(c.id) ?? [];
  }

  return topLevel;
}

// --- Biggest Wins ---

export async function getBiggestWinsThisWeek(limit = 8): Promise<{ display_name: string; match_key: string; amount: number; payout: number; profit: number }[]> {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("pool_bets")
    .select(`
      match_key,
      amount,
      payout,
      user:profiles!pool_bets_user_id_fkey(display_name)
    `)
    .not("payout", "is", null)
    .gt("payout", 0)
    .gte("created_at", weekAgo)
    .order("payout", { ascending: false })
    .limit(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[])
    .filter((d) => d.payout > d.amount)
    .map((d) => ({
      display_name: d.user?.display_name ?? d.user?.[0]?.display_name ?? "Anonymous",
      match_key: d.match_key,
      amount: d.amount,
      payout: d.payout,
      profit: d.payout - d.amount,
    }));
}

// --- Odds History ---

export async function getOddsHistory(matchKey: string): Promise<OddsHistoryPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("odds_history")
    .select("*")
    .eq("match_key", matchKey)
    .order("created_at", { ascending: true });

  return (data ?? []) as OddsHistoryPoint[];
}
