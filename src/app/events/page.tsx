import { getCurrentProfile } from "@/db/profiles";
import { redirect } from "next/navigation";
import { getActiveEventKeys, getCachedMatches, getAllPoolSummaries } from "@/db/bets";
// import { getAllSeasonEvents } from "@/lib/tba";
import { getUserFavoriteEvents } from "@/app/actions/favorites";
import { EventsList } from "@/components/events-list";

export default async function EventsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [eventKeys, poolMap, favoriteKeys] = await Promise.all([
    getActiveEventKeys(),
    getAllPoolSummaries(),
    getUserFavoriteEvents(profile.id),
  ]);

  const favoriteSet = new Set(favoriteKeys);

  // Build event summaries from cached data
  const eventSummaries: {
    key: string;
    name: string;
    totalMatches: number;
    completedMatches: number;
    upcomingMatches: number;
    totalVolume: number;
    startTime: string | null;
    isFavorite: boolean;
  }[] = [];

  for (const ek of eventKeys) {
    const matches = await getCachedMatches(ek);
    if (matches.length === 0) continue;

    const now = new Date().toISOString();
    const completed = matches.filter((m) => m.is_complete || (m.scheduled_time && m.scheduled_time < now));
    const upcoming = matches.filter((m) => !m.is_complete && (!m.scheduled_time || m.scheduled_time >= now));

    let volume = 0;
    for (const m of matches) {
      const pool = poolMap.get(m.match_key);
      if (pool) volume += pool.total_pool;
    }

    const earliest = matches
      .filter((m) => m.scheduled_time)
      .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""))[0];

    eventSummaries.push({
      key: ek,
      name: matches[0].event_name,
      totalMatches: matches.length,
      completedMatches: completed.length,
      upcomingMatches: upcoming.length,
      totalVolume: volume,
      startTime: earliest?.scheduled_time ?? null,
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

  // Filter "All" tab: show favorites + events from last 2 weeks
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentEvents = eventSummaries.filter((e) =>
    e.isFavorite || (e.startTime && e.startTime >= twoWeeksAgo) || e.upcomingMatches > 0
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-[#e6edf3]">Events</h1>
        <p className="text-[12px] text-[#7d8590] mt-0.5">FRC events with match schedules</p>
      </div>
      <EventsList
        events={recentEvents}
        allEvents={eventSummaries}
      />
    </div>
  );
}
