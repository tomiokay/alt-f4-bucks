import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { getAllPoolSummaries } from "@/db/bets";
import { getCurrentEvents } from "@/lib/tba";
import { getUserFavoriteEvents } from "@/app/actions/favorites";
import { EventsList } from "@/components/events-list";
import { createServiceClient } from "@/lib/supabase/server";

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
      .select("event_key, event_name, is_complete")
      .limit(20000),
  ]);

  const favoriteSet = new Set(favoriteKeys);

  // Group by event and count
  const eventStats = new Map<string, { name: string; total: number; completed: number }>();
  for (const m of (allMatches ?? []) as { event_key: string; event_name: string; is_complete: boolean }[]) {
    const existing = eventStats.get(m.event_key);
    if (existing) {
      existing.total++;
      if (m.is_complete) existing.completed++;
    } else {
      eventStats.set(m.event_key, {
        name: m.event_name,
        total: 1,
        completed: m.is_complete ? 1 : 0,
      });
    }
  }

  const eventSummaries = [...eventStats.entries()].map(([key, stats]) => {
    let volume = 0;
    for (const [mk, pool] of poolMap) {
      if (mk.startsWith(key + "_")) volume += pool.total_pool;
    }

    return {
      key,
      name: stats.name,
      totalMatches: stats.total,
      completedMatches: stats.completed,
      upcomingMatches: stats.total - stats.completed,
      totalVolume: volume,
      startTime: null as string | null,
      isFavorite: favoriteSet.has(key),
    };
  });

  // Sort: favorites first, then live, then by name
  eventSummaries.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (a.upcomingMatches > 0 && b.upcomingMatches === 0) return -1;
    if (a.upcomingMatches === 0 && b.upcomingMatches > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  // Unsynced TBA events in next 3 days
  const syncedKeys = new Set(eventStats.keys());
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
        events={eventSummaries}
        allEvents={eventSummaries}
        upcomingTbaEvents={upcomingTbaEvents}
      />
    </div>
  );
}
