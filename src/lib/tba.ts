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

async function tbaFetch(url: string): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: headers(),
      next: { revalidate: 60 },
      signal: controller.signal,
      // @ts-expect-error -- Next.js extended fetch option
      verbose: true,
    });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    console.error("[TBA] fetch failed:", url, e);
    return null;
  }
}

export async function getEventMatches(eventKey: string): Promise<TBAMatch[]> {
  const res = await tbaFetch(`${TBA_BASE}/event/${eventKey}/matches`);
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

  // Include events from the past 2 weeks + upcoming 2 weeks
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  return events.filter((e) => {
    const end = new Date(e.end_date + "T23:59:59");
    const start = new Date(e.start_date);
    return end >= twoWeeksAgo && start <= twoWeeksAhead;
  });
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
} {
  const hasScore =
    match.alliances.red.score >= 0 && match.alliances.blue.score >= 0;

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
    is_complete: hasScore && match.winning_alliance !== "",
    fetched_at: new Date().toISOString(),
  };
}
