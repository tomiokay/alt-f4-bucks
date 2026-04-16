"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/db/profiles";
import { revalidatePath } from "next/cache";

export async function toggleFavoriteEvent(eventKey: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not authenticated" };

  const service = await createServiceClient();

  // Check if already favorited
  const { data: existing } = await service
    .from("favorite_events")
    .select("id")
    .eq("user_id", profile.id)
    .eq("event_key", eventKey)
    .single();

  if (existing) {
    await service.from("favorite_events").delete().eq("id", existing.id);
    revalidatePath("/events");
    return { success: true, favorited: false };
  } else {
    await service.from("favorite_events").insert({
      user_id: profile.id,
      event_key: eventKey,
    });
    revalidatePath("/events");
    return { success: true, favorited: true };
  }
}

export async function getUserFavoriteEvents(userId: string): Promise<string[]> {
  const service = await createServiceClient();
  const { data } = await service
    .from("favorite_events")
    .select("event_key")
    .eq("user_id", userId);

  return (data ?? []).map((d) => d.event_key);
}
