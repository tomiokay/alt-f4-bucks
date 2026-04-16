import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/db/profiles";
import { getAllPoolSummaries, getCachedMatches } from "@/db/bets";
import { getCurrentEvents } from "@/lib/tba";
import { getUserFavoriteEvents } from "@/app/actions/favorites";
import { EventsList } from "@/components/events-list";
import { createServiceClient } from "@/lib/supabase/server";

export default async function EventsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const service = await createServiceClient();

  // Get all unique event keys + TBA events + favorites in parallel
  const [{ data: eventRows }, poolMap, favoriteKeys, tbaEvents] = await Promise.all([
    service
      .from("match_cache")
      .select("event_key, event_name")
      .limit(20000),
    getAllPoolSummaries(),
    getUserFavoriteEvents(profile.id),
    getCurrentEvents(),
  ]);

  // Get unique event keys
  const eventKeyMap = new Map<string, string>();
  for (const row of (eventRows ?? []) as { event_key: string; event_name: string }[]) {
    if (!eventKeyMap.has(row.event_key)) {
      eventKeyMap.set(row.event_key, row.event_name);
    }
  }

  const favoriteSet = new Set(favoriteKeys);
  const now = new Date().toISOString();

  // Build event summaries — fetch match counts per event (parallel)
  const eventKeys = [...eventKeyMap.keys()];
  const matchCounts = await Promise.all(
    eventKeys.map(async (ek) => {
      const [{ count: total }, { count: completed }] = await Promise.all([
        service
          .from("match_cache")
          .select("*", { count: "exact", head: true })
          .eq("event_key", ek),
        service
          .from("match_cache")
          .select("*", { count: "exact", head: true })
          .eq("event_key", ek)
          .eq("is_complete", true),
      ]);
      return { key: ek, total: total ?? 0, completed: completed ?? 0 };
    })
  );

  const eventSummaries = matchCounts.map(({ key, total, completed }) => {
    // Get volume from pool summaries
    let volume = 0;
    for (const [mk, pool] of poolMap) {
      if (mk.startsWith(key + "_")) volume += pool.total_pool;
    }

    return {
      key,
      name: eventKeyMap.get(key) ?? key,
      totalMatches: total,
      completedMatches: completed,
      upcomingMatches: total - completed,
      totalVolume: volume,
      startTime: null as string | null, // We don't need exact times for the list
      isFavorite: favoriteSet.has(key),
    };
  });

  // Sort: favorites first, then live events, then by name
  eventSummaries.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (a.upcomingMatches > 0 && b.upcomingMatches === 0) return -1;
    if (a.upcomingMatches === 0 && b.upcomingMatches > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  // Show all synced events
  const recentEvents = eventSummaries;

  // Show unsynced TBA events happening in the next 3 days
  const syncedKeys = new Set(eventKeys);
  const nowDate = new Date();
  const threeDaysFromNow = new Date(nowDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcomingTbaEvents = tbaEvents
    .filter((e) => {
      if (syncedKeys.has(e.key)) return false;
      const start = new Date(e.start_date);
      const end = new Date(e.end_date + "T23:59:59");
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
