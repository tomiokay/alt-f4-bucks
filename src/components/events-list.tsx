"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { syncEventMatches } from "@/app/actions/bets";
import { Download } from "lucide-react";

type EventSummary = {
  key: string;
  name: string;
  totalMatches: number;
  completedMatches: number;
  upcomingMatches: number;
  totalVolume: number;
  startTime: string | null;
};

type UnsyncedEvent = {
  key: string;
  name: string;
  startDate: string;
  endDate: string;
};

type Props = {
  events: EventSummary[];
  unsyncedEvents?: UnsyncedEvent[];
};

function formatDate(time: string | null): string {
  if (!time) return "TBD";
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EventsList({ events, unsyncedEvents = [] }: Props) {
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "completed" | "browse">("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [syncedKeys, setSyncedKeys] = useState<Set<string>>(new Set());
  const router = useRouter();

  const filtered = events.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.key.includes(search.toLowerCase())) {
      return false;
    }
    if (filter === "live") return e.upcomingMatches > 0 && e.completedMatches > 0;
    if (filter === "upcoming") return e.completedMatches === 0;
    if (filter === "completed") return e.upcomingMatches === 0 && e.completedMatches > 0;
    return true;
  });

  const filteredUnsynced = unsyncedEvents.filter((e) =>
    !syncedKeys.has(e.key) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.key.includes(search.toLowerCase()))
  );

  function handleSync(eventKey: string) {
    setSyncingKey(eventKey);
    startTransition(async () => {
      const res = await syncEventMatches(eventKey);
      setSyncingKey(null);
      if (!res.error) {
        setSyncedKeys((s) => new Set([...s, eventKey]));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg bg-[#161b22] p-0.5">
          {(["all", "live", "upcoming", "completed", "browse"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-medium capitalize transition-colors",
                filter === f ? "bg-[#21262d] text-[#e6edf3]" : "text-[#484f58]"
              )}
            >
              {f === "browse" ? "Add Event" : f}
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

      {filter === "browse" ? (
        /* Browse all TBA events */
        <div className="space-y-3">
          <p className="text-[12px] text-[#7d8590]">
            {filteredUnsynced.length} events available to add
          </p>
          {filteredUnsynced.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-[13px] text-[#484f58]">
              {search ? "No matching events" : "All events are already synced"}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUnsynced.map((event) => {
                const isSyncing = syncingKey === event.key;
                const now = new Date();
                const start = new Date(event.startDate);
                const end = new Date(event.endDate + "T23:59:59");
                const isLive = start <= now && end >= now;
                const isPast = end < now;

                return (
                  <div
                    key={event.key}
                    className="rounded-xl bg-[#161b22] p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isLive ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22c55e]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                            LIVE
                          </span>
                        ) : isPast ? (
                          <span className="text-[10px] font-medium text-[#484f58]">ENDED</span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#388bfd]">UPCOMING</span>
                        )}
                      </div>
                      <h3 className="text-[13px] font-medium text-[#e6edf3] leading-snug">
                        {event.name}
                      </h3>
                      <p className="text-[11px] text-[#484f58] mt-0.5">
                        {formatDate(event.startDate)} — {formatDate(event.endDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSync(event.key)}
                      disabled={isPending}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#22c55e]/10 px-3 py-1.5 text-[11px] font-semibold text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-50 transition-colors border border-[#22c55e]/30"
                    >
                      <Download className="h-3 w-3" />
                      {isSyncing ? "Syncing..." : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Synced events grid */
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[13px] text-[#484f58]">No events found</p>
              <button
                onClick={() => setFilter("browse")}
                className="mt-2 text-[12px] text-[#388bfd] hover:text-[#58a6ff]"
              >
                Browse and add events
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => {
                const isLive = event.upcomingMatches > 0 && event.completedMatches > 0;
                const isDone = event.upcomingMatches === 0 && event.completedMatches > 0;
                const progress = event.totalMatches > 0
                  ? Math.round((event.completedMatches / event.totalMatches) * 100)
                  : 0;

                return (
                  <Link
                    key={event.key}
                    href={`/events/${event.key}`}
                    className="rounded-xl bg-[#161b22] p-4 hover:bg-[#1c2128] transition-colors"
                  >
                    {/* Status badge */}
                    <div className="flex items-center justify-between mb-2">
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
