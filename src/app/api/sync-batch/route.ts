import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEventMatches, getCurrentEvents, tbaMatchToCache } from "@/lib/tba";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0");
  const pageSize = parseInt(request.nextUrl.searchParams.get("size") ?? "20");

  const service = await createServiceClient();
  const allEvents = await getCurrentEvents();

  const start = page * pageSize;
  const batch = allEvents.slice(start, start + pageSize);
  const eventNameMap = new Map(allEvents.map((e) => [e.key, e.name]));

  let totalSynced = 0;
  let eventsWithMatches = 0;
  let fetchErrors = 0;

  for (const event of batch) {
    try {
      const matches = await getEventMatches(event.key);
      if (matches.length === 0) continue;
      eventsWithMatches++;
      const rows = matches.map((m) => tbaMatchToCache(m, event.name));

      let { error } = await service.from("match_cache").upsert(rows, {
        onConflict: "match_key",
      });

      if (error && error.code === "PGRST204") {
        const basicRows = rows.map(({ red_auto_points, blue_auto_points, red_rp, blue_rp, ...rest }) => rest);
        const retry = await service.from("match_cache").upsert(basicRows, { onConflict: "match_key" });
        error = retry.error;
      }

      if (!error) totalSynced += rows.length;
      else fetchErrors++;
    } catch {
      fetchErrors++;
    }
  }

  return NextResponse.json({
    page,
    pageSize,
    totalEvents: allEvents.length,
    totalPages: Math.ceil(allEvents.length / pageSize),
    batchKeys: batch.map((e) => e.key),
    synced: totalSynced,
    eventsWithMatches,
    fetchErrors,
  });
}
