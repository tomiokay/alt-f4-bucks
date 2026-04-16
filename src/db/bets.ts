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
  // Fetch all event keys — need enough rows to cover all events
  const { data } = await supabase
    .from("match_cache")
    .select("event_key")
    .limit(20000);

  const keys = new Set((data ?? []).map((d: { event_key: string }) => d.event_key));
  return Array.from(keys);
}

export async function getAllCachedMatches(): Promise<MatchCache[]> {
  const supabase = await createClient();

  // Only fetch matches from the last 3 weeks + all upcoming/incomplete matches
  const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recent }, { data: incomplete }] = await Promise.all([
    supabase
      .from("match_cache")
      .select("*")
      .gte("scheduled_time", threeWeeksAgo)
      .order("scheduled_time", { ascending: true })
      .limit(5000),
    supabase
      .from("match_cache")
      .select("*")
      .eq("is_complete", false)
      .order("scheduled_time", { ascending: true })
      .limit(5000),
  ]);

  // Merge and deduplicate
  const seen = new Set<string>();
  const results: MatchCache[] = [];
  for (const m of [...(recent ?? []), ...(incomplete ?? [])] as MatchCache[]) {
    if (!seen.has(m.match_key)) {
      seen.add(m.match_key);
      results.push(m);
    }
  }
  return results;
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
  "qualification": ["qm"],
  "qualifications": ["qm"],
  "match": ["qm"],
  "semis": ["sf"],
  "semi": ["sf"],
  "semifinal": ["sf"],
  "semifinals": ["sf"],
  "finals": ["f"],
  "final": ["f"],
  "playoff": ["sf", "f"],
  "playoffs": ["sf", "f"],
  "elims": ["sf", "f"],
  "elimination": ["sf", "f"],
  "champs": ["championship"],
  "worlds": ["championship"],
  "dcmp": ["district championship"],
  "regionals": ["regional"],
};

export async function searchMatches(query: string, limit = 100): Promise<MatchCache[]> {
  const supabase = await createClient();
  const q = query.toLowerCase().trim();

  // Sanitize: remove characters that could break PostgREST filters
  const sanitize = (s: string) => s.replace(/[%(),.*]/g, "");

  // Parse multi-word queries like "niagara qual 11" or "technology playoff 1"
  const words = q.split(/\s+/);
  let eventNameParts: string[] = [];
  let compLevel: string | null = null;
  let matchNumber: number | null = null;

  for (const word of words) {
    // Check if it's a number (match number)
    if (/^\d+$/.test(word)) {
      matchNumber = parseInt(word);
      continue;
    }
    // Check if it's a comp level alias
    const alias = SEARCH_ALIASES[word];
    if (alias && alias.some(a => ["qm", "sf", "f"].includes(a))) {
      compLevel = alias.find(a => ["qm", "sf", "f"].includes(a)) ?? null;
      continue;
    }
    if (["qm", "sf", "f"].includes(word)) {
      compLevel = word;
      continue;
    }
    // Otherwise it's part of the event name
    eventNameParts.push(word);
  }

  // Also expand full-query aliases for single-word searches
  const fullAliases = SEARCH_ALIASES[q] ?? [];

  let results: MatchCache[] = [];

  // Strategy 1: Multi-part query (e.g. "niagara qual 11")
  if (eventNameParts.length > 0 && (compLevel || matchNumber !== null)) {
    let builder = supabase
      .from("match_cache")
      .select("*");

    // Filter by event name
    for (const part of eventNameParts) {
      builder = builder.ilike("event_name", `%${sanitize(part)}%`);
    }

    // Filter by comp level
    if (compLevel) {
      builder = builder.eq("comp_level", compLevel);
    }

    // Filter by match number
    if (matchNumber !== null) {
      builder = builder.eq("match_number", matchNumber);
    }

    const { data } = await builder
      .order("scheduled_time", { ascending: true })
      .limit(limit);

    if (data) results.push(...(data as MatchCache[]));
  }

  // Strategy 2: Standard search (event name, match key, aliases)
  if (results.length === 0) {
    const searchTerms = [q, ...fullAliases].map(sanitize).filter(Boolean);

    for (const term of searchTerms) {
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
    if (["qm", "sf", "f"].includes(q) || fullAliases.some(a => ["qm", "sf", "f"].includes(a))) {
      const compLevels = fullAliases.length > 0 ? fullAliases.filter(a => ["qm", "sf", "f"].includes(a)) : [q];
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
  }

  // Strategy 3: Team number search (using Postgres array contains)
  if (results.length === 0 && /^\d+$/.test(q)) {
    const { data: redData } = await supabase
      .from("match_cache")
      .select("*")
      .contains("red_teams", [q])
      .order("scheduled_time", { ascending: true })
      .limit(limit);

    const { data: blueData } = await supabase
      .from("match_cache")
      .select("*")
      .contains("blue_teams", [q])
      .order("scheduled_time", { ascending: true })
      .limit(limit);

    if (redData) results.push(...(redData as MatchCache[]));
    if (blueData) results.push(...(blueData as MatchCache[]));
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
