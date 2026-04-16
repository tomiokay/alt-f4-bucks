const TBA_BASE = "https://www.thebluealliance.com/api/v3";

function headers() {
  const key = process.env.TBA_API_KEY;
  if (!key) throw new Error("TBA_API_KEY is not set");
  return { "X-TBA-Auth-Key": key };
}

export type TBAMatch = {
  key: string;
  event_key: string;
  comp_level: string;
  match_number: number;
  set_number: number;
  time: number | null;
  actual_time: number | null;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  winning_alliance: string;
  score_breakdown: Record<string, unknown> | null;
};

export type TBAEvent = {
  key: string;
  name: string;
  start_date: string;
  end_date: string;
  event_type: number;
};

function stripFrc(teamKey: string): string {
  return teamKey.replace(/^frc/, "");
}

async function tbaFetch(url: string, noCache = false): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: headers(),
      ...(noCache ? { cache: "no-store" as const } : { next: { revalidate: 120 } }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    console.error("[TBA] fetch failed:", url, e);
    return null;
  }
}

export async function getEventMatches(eventKey: string, noCache = false): Promise<TBAMatch[]> {
  const res = await tbaFetch(`${TBA_BASE}/event/${eventKey}/matches`, noCache);
  if (!res || !res.ok) return [];
  return res.json();
}

export async function getMatch(matchKey: string): Promise<TBAMatch | null> {
  const res = await tbaFetch(`${TBA_BASE}/match/${matchKey}`);
  if (!res || !res.ok) return null;
  return res.json();
}

export async function getCurrentEvents(year?: number): Promise<TBAEvent[]> {
  const y = year ?? new Date().getFullYear();
  const res = await tbaFetch(`${TBA_BASE}/events/${y}/simple`);
  if (!res || !res.ok) return [];
  const events: TBAEvent[] = await res.json();

  // Return all season events — sync everything with match data
  return events;
}

export async function getAllSeasonEvents(year?: number): Promise<TBAEvent[]> {
  const y = year ?? new Date().getFullYear();
  const res = await tbaFetch(`${TBA_BASE}/events/${y}/simple`);
  if (!res || !res.ok) return [];
  const events: TBAEvent[] = await res.json();

  // Return all events, sorted by start date
  return events.sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export type TBARanking = {
  rank: number;
  team_key: string;
  record: { wins: number; losses: number; ties: number };
  qual_average: number | null;
  matches_played: number;
  dq: number;
  sort_orders: number[];
};

export type TBAAlliance = {
  name: string;
  picks: string[]; // e.g. ["frc254", "frc971", "frc1678"]
  status?: {
    level: string; // "f", "sf", "qf"
    status: string; // "won", "eliminated", "playing"
    record: { wins: number; losses: number; ties: number };
  };
};

export async function getEventRankings(eventKey: string): Promise<TBARanking[]> {
  const res = await tbaFetch(`${TBA_BASE}/event/${eventKey}/rankings`);
  if (!res || !res.ok) return [];
  const data = await res.json();
  if (!data?.rankings) return [];
  return data.rankings.map((r: Record<string, unknown>) => ({
    rank: r.rank as number,
    team_key: r.team_key as string,
    record: r.record as { wins: number; losses: number; ties: number },
    qual_average: (r.qual_average as number) ?? null,
    matches_played: r.matches_played as number,
    dq: r.dq as number,
    sort_orders: (r.sort_orders as number[]) ?? [],
  }));
}

export async function getEventAlliances(eventKey: string): Promise<TBAAlliance[]> {
  const res = await tbaFetch(`${TBA_BASE}/event/${eventKey}/alliances`);
  if (!res || !res.ok) return [];
  const data: TBAAlliance[] = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((a, i) => ({
    name: a.name || `Alliance ${i + 1}`,
    picks: a.picks ?? [],
    status: a.status ?? undefined,
  }));
}

export function tbaMatchToCache(
  match: TBAMatch,
  eventName: string
): {
  match_key: string;
  event_key: string;
  event_name: string;
  comp_level: string;
  match_number: number;
  red_teams: string[];
  blue_teams: string[];
  scheduled_time: string | null;
  actual_time: string | null;
  red_score: number | null;
  blue_score: number | null;
  winning_alliance: string | null;
  is_complete: boolean;
  fetched_at: string;
  red_auto_points: number | null;
  blue_auto_points: number | null;
  red_rp: number | null;
  blue_rp: number | null;
} {
  const hasScore =
    match.alliances.red.score >= 0 && match.alliances.blue.score >= 0;

  const sb = match.score_breakdown as Record<string, Record<string, number>> | null;
  const redAuto = sb?.red?.totalAutoPoints ?? null;
  const blueAuto = sb?.blue?.totalAutoPoints ?? null;
  const redRp = sb?.red?.rp ?? null;
  const blueRp = sb?.blue?.rp ?? null;

  return {
    match_key: match.key,
    event_key: match.event_key,
    event_name: eventName,
    comp_level: match.comp_level,
    match_number: match.match_number,
    red_teams: match.alliances.red.team_keys.map(stripFrc),
    blue_teams: match.alliances.blue.team_keys.map(stripFrc),
    scheduled_time: match.time
      ? new Date(match.time * 1000).toISOString()
      : null,
    actual_time: match.actual_time
      ? new Date(match.actual_time * 1000).toISOString()
      : null,
    red_score: hasScore ? match.alliances.red.score : null,
    blue_score: hasScore ? match.alliances.blue.score : null,
    winning_alliance: match.winning_alliance || null,
    is_complete: hasScore || (match.actual_time !== null),
    fetched_at: new Date().toISOString(),
    red_auto_points: redAuto,
    blue_auto_points: blueAuto,
    red_rp: redRp,
    blue_rp: blueRp,
  };
}
