import { NextResponse } from "next/server";
import { getCurrentEvents } from "@/lib/tba";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await getCurrentEvents();

  return NextResponse.json({
    total: events.length,
    events: events.map((e) => ({
      key: e.key,
      name: e.name,
      start: e.start_date,
      end: e.end_date,
    })),
  });
}
