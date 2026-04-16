"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/db/profiles";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { containsProfanity } from "@/lib/profanity";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Max 50 characters"),
});

export async function createCustomLeaderboard(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not authenticated" };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (containsProfanity(parsed.data.name)) {
    return { error: "Name contains inappropriate language." };
  }

  const service = await createServiceClient();

  // Create the leaderboard
  const { data: board, error } = await service
    .from("custom_leaderboards")
    .insert({ name: parsed.data.name, created_by: profile.id })
    .select("id")
    .single();

  if (error || !board) return { error: error?.message ?? "Failed to create" };

  // Add creator as first member
  await service.from("custom_leaderboard_members").insert({
    leaderboard_id: board.id,
    user_id: profile.id,
  });

  revalidatePath("/leaderboard");
  return { success: true, id: board.id };
}

export async function inviteToLeaderboard(leaderboardId: string, userId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not authenticated" };

  const service = await createServiceClient();

  // Verify the inviter is a member
  const { data: membership } = await service
    .from("custom_leaderboard_members")
    .select("id")
    .eq("leaderboard_id", leaderboardId)
    .eq("user_id", profile.id)
    .single();

  if (!membership) return { error: "You're not a member of this leaderboard" };

  // Check if already a member
  const { data: existing } = await service
    .from("custom_leaderboard_members")
    .select("id")
    .eq("leaderboard_id", leaderboardId)
    .eq("user_id", userId)
    .single();

  if (existing) return { error: "User is already a member" };

  // Get leaderboard name
  const { data: board } = await service
    .from("custom_leaderboards")
    .select("name")
    .eq("id", leaderboardId)
    .single();

  // Send notification
  await service.from("notifications").insert({
    user_id: userId,
    type: "leaderboard_invite",
    message: `${profile.display_name} invited you to join the "${board?.name ?? "Custom"}" leaderboard`,
    meta: { leaderboard_id: leaderboardId, invited_by: profile.id },
  });

  return { success: true };
}

export async function joinLeaderboard(leaderboardId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not authenticated" };

  const service = await createServiceClient();

  // Check if already a member
  const { data: existing } = await service
    .from("custom_leaderboard_members")
    .select("id")
    .eq("leaderboard_id", leaderboardId)
    .eq("user_id", profile.id)
    .single();

  if (existing) return { error: "Already a member" };

  const { error } = await service.from("custom_leaderboard_members").insert({
    leaderboard_id: leaderboardId,
    user_id: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/leaderboard");
  return { success: true };
}

export async function leaveLeaderboard(leaderboardId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not authenticated" };

  const service = await createServiceClient();

  // Check if creator — creators can't leave, they must delete
  const { data: board } = await service
    .from("custom_leaderboards")
    .select("created_by")
    .eq("id", leaderboardId)
    .single();

  if (board?.created_by === profile.id) {
    return { error: "As the creator, delete the leaderboard instead of leaving" };
  }

  await service
    .from("custom_leaderboard_members")
    .delete()
    .eq("leaderboard_id", leaderboardId)
    .eq("user_id", profile.id);

  revalidatePath("/leaderboard");
  return { success: true };
}

export async function deleteLeaderboard(leaderboardId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not authenticated" };

  const service = await createServiceClient();

  // Verify creator
  const { data: board } = await service
    .from("custom_leaderboards")
    .select("created_by")
    .eq("id", leaderboardId)
    .single();

  if (!board || board.created_by !== profile.id) {
    return { error: "Only the creator can delete this leaderboard" };
  }

  // Members cascade-delete
  await service.from("custom_leaderboards").delete().eq("id", leaderboardId);

  revalidatePath("/leaderboard");
  return { success: true };
}
