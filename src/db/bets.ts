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
  // Supabase defaults to 1000 rows — fetch up to 10000 to get all events
  const { data } = await supabase
    .from("match_cache")
    .select("event_key")
    .limit(10000);

  const keys = new Set((data ?? []).map((d: { event_key: string }) => d.event_key));
  return Array.from(keys);
}

// --- Search matches ---

export async function searchMatches(query: string, limit = 100): Promise<MatchCache[]> {
  const supabase = await createClient();
  // Search by event name or match key
  const { data } = await supabase
    .from("match_cache")
    .select("*")
    .or(`event_name.ilike.%${query}%,match_key.ilike.%${query}%`)
    .order("scheduled_time", { ascending: true })
    .limit(limit);

  // Also search by team number in arrays (can't do array contains via REST easily, do client-side)
  const results = (data ?? []) as MatchCache[];

  // If no results from name/key, try team number search
  if (results.length === 0) {
    const { data: allData } = await supabase
      .from("match_cache")
      .select("*")
      .order("scheduled_time", { ascending: true })
      .limit(10000);

    return ((allData ?? []) as MatchCache[]).filter((m) =>
      m.red_teams.some((t) => t.includes(query)) ||
      m.blue_teams.some((t) => t.includes(query))
    ).slice(0, limit);
  }

  return results;
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

  // Build threaded structure
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
