"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/db/profiles";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { TRANSACTION_CATEGORIES } from "@/lib/constants";

const awardSchema = z.object({
  toUserId: z.string().uuid("Invalid member selection"),
  amount: z.coerce
    .number()
    .int("Amount must be a whole number")
    .refine((n) => n !== 0, "Amount cannot be zero"),
  reason: z.string().min(1, "Reason is required").max(500),
  category: z.enum(TRANSACTION_CATEGORIES, {
    error: "Please select a category",
  }),
});

export async function awardBucks(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const parsed = awardSchema.safeParse({
    toUserId: formData.get("toUserId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.toUserId === profile.id) {
    return { error: "You cannot award bucks to yourself" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("transactions").insert({
    type: parsed.data.amount > 0 ? "award" : "adjustment",
    amount: parsed.data.amount,
    to_user_id: parsed.data.toUserId,
    by_user_id: profile.id,
    reason: parsed.data.reason,
    category: parsed.data.category,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/manager");
  revalidatePath("/dashboard");
  revalidatePath("/");

  return { success: true };
}
