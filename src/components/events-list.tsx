"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toggleFavoriteEvent } from "@/app/actions/favorites";
import { Star } from "lucide-react";

type EventSummary = {
  key: string;
  name: string;
  totalMatches: number;
  completedMatches: number;
  upcomingMatches: number;
  totalVolume: number;
  startTime: string | null;
  isFavorite: boolean;
};

type UpcomingTbaEvent = {
  key: string;
  name: string;
  startDate: string;
  endDate: string;
};

type Props = {
  events: EventSummary[];
  allEvents: EventSummary[];
  upcomingTbaEvents?: UpcomingTbaEvent[];
};

function formatDate(time: string | null): string {
  if (!time) return "TBD";
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EventsList({ events, allEvents, upcomingTbaEvents = [] }: Props) {
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "completed" | "favorites">("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(allEvents.filter((e) => e.isFavorite).map((e) => e.key))
  );
  const router = useRouter();

  // Use allEvents when searching, recent events otherwise
  const baseEvents = search ? allEvents : events;

  const filtered = baseEvents.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.key.includes(search.toLowerCase())) {
      return false;
    }
    if (filter === "favorites") return favorites.has(e.key);
    if (filter === "live") return e.upcomingMatches > 0 && e.completedMatches > 0;
    if (filter === "upcoming") return e.completedMatches === 0;
    if (filter === "completed") return e.upcomingMatches === 0 && e.completedMatches > 0;
    return true;
  });

  function handleToggleFavorite(eventKey: string) {
    startTransition(async () => {
      const res = await toggleFavoriteEvent(eventKey);
      if (res.success) {
        setFavorites((f) => {
          const next = new Set(f);
          if (res.favorited) next.add(eventKey);
          else next.delete(eventKey);
          return next;
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg bg-[#161b22] p-0.5">
          {(["all", "live", "upcoming", "completed", "favorites"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-medium capitalize transition-colors",
                filter === f ? "bg-[#21262d] text-[#e6edf3]" : "text-[#484f58]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#484f58]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full h-8 rounded-lg bg-[#0d1117] border border-[#21262d] pl-9 pr-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[13px] text-[#484f58]">
          No events found
        </div>
      ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => {
                const isLive = event.upcomingMatches > 0 && event.completedMatches > 0;
                const isDone = event.upcomingMatches === 0 && event.completedMatches > 0;
                const progress = event.totalMatches > 0
                  ? Math.round((event.completedMatches / event.totalMatches) * 100)
                  : 0;
                const isFav = favorites.has(event.key);

                return (
                  <div key={event.key} className="rounded-xl bg-[#161b22] hover:bg-[#1c2128] transition-colors relative">
                    {/* Favorite button */}
                    <button
                      onClick={() => handleToggleFavorite(event.key)}
                      className="absolute top-3 right-3 z-10"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isFav ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#484f58] hover:text-[#7d8590]"
                        )}
                      />
                    </button>

                    <Link href={`/events/${event.key}`} className="block p-4">
                      {/* Status badge */}
                      <div className="flex items-center justify-between mb-2 pr-6">
                        {isLive ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#22c55e]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                            LIVE
                          </span>
                        ) : isDone ? (
                          <span className="text-[10px] font-medium text-[#484f58]">COMPLETED</span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#388bfd]">UPCOMING</span>
                        )}
                        <span className="text-[10px] text-[#484f58]">{formatDate(event.startTime)}</span>
                      </div>

                      {/* Event name */}
                      <h3 className="text-[14px] font-medium text-[#e6edf3] leading-snug mb-3">
                        {event.name}
                      </h3>

                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-[#21262d] overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-[#22c55e] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-[11px] text-[#484f58]">
                        <span>{event.completedMatches}/{event.totalMatches} matches</span>
                        {event.totalVolume > 0 && (
                          <span>${event.totalVolume.toLocaleString()} vol</span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

      {/* TBA events without match schedules yet — only show in all/upcoming */}
      {(filter === "upcoming" || filter === "all") && upcomingTbaEvents.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-[14px] font-medium text-[#7d8590]">No match schedule yet</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingTbaEvents
              .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.key.includes(search.toLowerCase()))
              .map((event) => (
                <div
                  key={event.key}
                  className="rounded-xl bg-[#161b22] p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-[#388bfd]">UPCOMING</span>
                    <span className="text-[10px] text-[#484f58]">
                      {formatDate(event.startDate)}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-medium text-[#e6edf3] leading-snug mb-3">
                    {event.name}
                  </h3>
                  <p className="text-[11px] text-[#484f58]">
                    No match schedule yet
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
