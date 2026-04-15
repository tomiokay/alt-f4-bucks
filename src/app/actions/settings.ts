"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50, "Max 50 characters"),
  teamNumber: z.string().max(10, "Max 10 characters").optional(),
});

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    teamNumber: formData.get("teamNumber") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      team_number: parsed.data.teamNumber || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true };
}

const changePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: error.message };

  return { success: true };
}

// Admin: set team number for any user
const adminSetTeamSchema = z.object({
  userId: z.string().uuid("Invalid user"),
  teamNumber: z.string().max(10, "Max 10 characters"),
});

export async function adminSetTeamNumber(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check admin/manager role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return { error: "Not authorized" };
  }

  const parsed = adminSetTeamSchema.safeParse({
    userId: formData.get("userId"),
    teamNumber: formData.get("teamNumber"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ team_number: parsed.data.teamNumber || null })
    .eq("id", parsed.data.userId);

  if (error) return { error: error.message };

  revalidatePath("/manager");
  revalidatePath("/leaderboard");
  return { success: true };
}

// Admin: bulk set team number for all users
export async function adminBulkSetTeamNumber(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return { error: "Not authorized" };
  }

  const teamNumber = formData.get("teamNumber") as string;
  if (!teamNumber) return { error: "Team number required" };

  const userIds = formData.getAll("userIds") as string[];
  if (userIds.length === 0) return { error: "Select at least one member" };

  const service = await createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ team_number: teamNumber })
    .in("id", userIds);

  if (error) return { error: error.message };

  revalidatePath("/manager");
  revalidatePath("/leaderboard");
  return { success: true, count: userIds.length };
}
