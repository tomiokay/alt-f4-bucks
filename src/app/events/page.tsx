import { getCurrentProfile } from "@/db/profiles";
import { redirect } from "next/navigation";
import { getAllPoolSummaries } from "@/db/bets";
import { getCurrentEvents } from "@/lib/tba";
import { getUserFavoriteEvents } from "@/app/actions/favorites";
import { EventsList } from "@/components/events-list";
import { createServiceClient } from "@/lib/supabase/server";
import type { MatchCache } from "@/lib/types";

export default async function EventsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const service = await createServiceClient();

  const [poolMap, favoriteKeys, tbaEvents, { data: allMatches }] = await Promise.all([
    getAllPoolSummaries(),
    getUserFavoriteEvents(profile.id),
    getCurrentEvents(),
    service
      .from("match_cache")
      .select("event_key, event_name, match_key, is_complete, scheduled_time")
      .order("scheduled_time", { ascending: true })
      .limit(20000),
  ]);

  const favoriteSet = new Set(favoriteKeys);
  const now = new Date().toISOString();

  // Group matches by event
  const eventMap = new Map<string, { name: string; matches: typeof allMatches }>();
  for (const m of (allMatches ?? []) as Pick<MatchCache, "event_key" | "event_name" | "match_key" | "is_complete" | "scheduled_time">[]) {
    if (!eventMap.has(m.event_key)) {
      eventMap.set(m.event_key, { name: m.event_name, matches: [] });
    }
    eventMap.get(m.event_key)!.matches!.push(m);
  }

  // Build event summaries
  const eventSummaries: {
    key: string;
    name: string;
    totalMatches: number;
    completedMatches: number;
    upcomingMatches: number;
    totalVolume: number;
    startTime: string | null;
    endTime: string | null;
    isFavorite: boolean;
  }[] = [];

  for (const [ek, { name, matches }] of eventMap) {
    const matchList = matches as Pick<MatchCache, "event_key" | "event_name" | "match_key" | "is_complete" | "scheduled_time">[];
    if (matchList.length === 0) continue;

    const completed = matchList.filter((m) => m.is_complete || (m.scheduled_time && m.scheduled_time < now));
    const upcoming = matchList.filter((m) => !m.is_complete && (!m.scheduled_time || m.scheduled_time >= now));

    let volume = 0;
    for (const m of matchList) {
      const pool = poolMap.get(m.match_key);
      if (pool) volume += pool.total_pool;
    }

    const sorted = matchList
      .filter((m) => m.scheduled_time)
      .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));

    eventSummaries.push({
      key: ek,
      name,
      totalMatches: matchList.length,
      completedMatches: completed.length,
      upcomingMatches: upcoming.length,
      totalVolume: volume,
      startTime: sorted[0]?.scheduled_time ?? null,
      endTime: sorted[sorted.length - 1]?.scheduled_time ?? null,
      isFavorite: favoriteSet.has(ek),
    });
  }

  // Sort: favorites first, then events with upcoming matches, then by start time
  eventSummaries.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (a.upcomingMatches > 0 && b.upcomingMatches === 0) return -1;
    if (a.upcomingMatches === 0 && b.upcomingMatches > 0) return 1;
    const aTime = a.startTime ?? "9999";
    const bTime = b.startTime ?? "9999";
    return aTime.localeCompare(bTime);
  });

  // Show all synced events (filtering is done client-side via tabs)
  const recentEvents = eventSummaries;

  // Show unsynced TBA events happening in the next 3 days
  const syncedKeys = new Set(eventMap.keys());
  const nowDate = new Date();
  const threeDaysFromNow = new Date(nowDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcomingTbaEvents = tbaEvents
    .filter((e) => {
      if (syncedKeys.has(e.key)) return false;
      const start = new Date(e.start_date);
      const end = new Date(e.end_date + "T23:59:59");
      // Show if starting within 3 days OR currently happening
      return (start <= threeDaysFromNow && end >= nowDate);
    })
    .map((e) => ({
      key: e.key,
      name: e.name,
      startDate: e.start_date,
      endDate: e.end_date,
    }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-[#e6edf3]">Events</h1>
        <p className="text-[12px] text-[#7d8590] mt-0.5">FRC events with match schedules</p>
      </div>
      <EventsList
        events={recentEvents}
        allEvents={eventSummaries}
        upcomingTbaEvents={upcomingTbaEvents}
      />
    </div>
  );
}
