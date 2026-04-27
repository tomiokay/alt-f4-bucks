import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/db/profiles";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ claimed: false });

  const service = await createServiceClient();
  const { data } = await service
    .from("transactions")
    .select("id")
    .eq("to_user_id", profile.id)
    .eq("category", "worlds_bonus")
    .limit(1);

  return NextResponse.json({ claimed: (data?.length ?? 0) > 0 });
}

export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const service = await createServiceClient();

  // Check if already claimed
  const { data: existing } = await service
    .from("transactions")
    .select("id")
    .eq("to_user_id", profile.id)
    .eq("category", "worlds_bonus")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Already claimed" });
  }

  // Double-check to prevent race condition
  const { data: recheck } = await service
    .from("transactions")
    .select("id")
    .eq("to_user_id", profile.id)
    .eq("category", "worlds_bonus")
    .limit(1);

  if (recheck && recheck.length > 0) {
    return NextResponse.json({ error: "Already claimed" });
  }

  // Grant 10,000 AF4 worlds bonus
  await service.from("transactions").insert({
    type: "award",
    amount: 10000,
    to_user_id: profile.id,
    reason: "Worlds bonus — $10,000 AF4 for FIRST Championship betting",
    category: "worlds_bonus",
  });

  return NextResponse.json({ success: true });
}
