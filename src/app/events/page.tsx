import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { getAllPoolSummaries } from "@/db/bets";
import { getCurrentEvents } from "@/lib/tba";
import { getUserFavoriteEvents } from "@/app/actions/favorites";
import { EventsList } from "@/components/events-list";
import { createServiceClient } from "@/lib/supabase/server";

function EventsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[#161b22] rounded-md" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[140px]" />
        ))}
      </div>
    </div>
  );
}

export default async function EventsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-[#e6edf3]">Events</h1>
        <p className="text-[12px] text-[#7d8590] mt-0.5">FRC events with match schedules</p>
      </div>
      <Suspense fallback={<EventsSkeleton />}>
        <EventsContent userId={profile.id} />
      </Suspense>
    </div>
  );
}

async function EventsContent({ userId }: { userId: string }) {
  const service = await createServiceClient();

  const [poolMap, favoriteKeys, tbaEvents] = await Promise.all([
    getAllPoolSummaries(),
    getUserFavoriteEvents(userId),
    getCurrentEvents(),
  ]);

  // Fetch match counts per event — only recent events (last 4 weeks) + incomplete
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const { data: matchData } = await service
    .from("match_cache")
    .select("event_key, event_name, is_complete, scheduled_time")
    .or(`scheduled_time.gte.${fourWeeksAgo},is_complete.eq.false`)
    .limit(1000);

  const allMatches = (matchData ?? []) as { event_key: string; event_name: string; is_complete: boolean; scheduled_time: string | null }[];

  const favoriteSet = new Set(favoriteKeys);

  // Group by event and count
  const eventStats = new Map<string, { name: string; total: number; completed: number; earliest: string | null }>();
  for (const m of allMatches) {
    const existing = eventStats.get(m.event_key);
    if (existing) {
      existing.total++;
      if (m.is_complete) existing.completed++;
      if (m.scheduled_time && (!existing.earliest || m.scheduled_time < existing.earliest)) {
        existing.earliest = m.scheduled_time;
      }
    } else {
      eventStats.set(m.event_key, {
        name: m.event_name,
        total: 1,
        completed: m.is_complete ? 1 : 0,
        earliest: m.scheduled_time,
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
      startTime: stats.earliest,
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

  // Unsynced TBA events in next 3 days or favorited
  const syncedKeys = new Set(eventStats.keys());
  const nowDate = new Date();
  const threeDaysFromNow = new Date(nowDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcomingTbaEvents = tbaEvents
    .filter((e) => {
      if (syncedKeys.has(e.key)) return false;
      if (favoriteSet.has(e.key)) return true;
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
    <EventsList
      events={eventSummaries}
      allEvents={eventSummaries}
      upcomingTbaEvents={upcomingTbaEvents}
      favoriteKeys={favoriteKeys}
    />
  );
}
