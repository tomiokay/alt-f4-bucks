"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { containsProfanity } from "@/lib/profanity";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  displayName: z.string().min(1, "Display name is required").max(50),
});

/** Ensure user has received their welcome bonus */
async function ensureWelcomeBonus(userId: string) {
  try {
    const service = await createServiceClient();

    // Check if they already have a bonus
    const { data: existing } = await service
      .from("transactions")
      .select("id")
      .eq("to_user_id", userId)
      .eq("category", "bonus")
      .limit(1);

    if (existing && existing.length > 0) return; // Already has bonus

    // Grant 10000 AF4
    await service.from("transactions").insert({
      type: "award",
      amount: 10000,
      to_user_id: userId,
      reason: "Welcome bonus — 10,000 AF4 to get started",
      category: "bonus",
    });

    // Send welcome notification
    await service.from("notifications").insert({
      user_id: userId,
      type: "welcome",
      message: "Welcome to Alt-F4 Bucks! You've been given $10,000 AF4 to start trading.",
      meta: {},
    });
  } catch {
    // Non-critical — don't block login/signup
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    // Check if banned before allowing in
    const service = await createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("banned")
      .eq("id", data.user.id)
      .single();

    if (profile?.banned) {
      await supabase.auth.signOut();
      return { error: "This account has been suspended." };
    }

    await ensureWelcomeBonus(data.user.id);
  }

  const redirectTo = formData.get("redirect") as string;
  redirect(redirectTo || "/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (containsProfanity(parsed.data.displayName)) {
    return { error: "Display name contains inappropriate language." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Grant welcome bonus immediately
  if (data.user) {
    await ensureWelcomeBonus(data.user.id);
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
