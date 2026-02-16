"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const purchaseSchema = z.object({
  itemId: z.string().uuid("Invalid item"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export async function purchaseItem(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = purchaseSchema.safeParse({
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Use the atomic RPC function to prevent race conditions
  const { data, error } = await supabase.rpc("purchase_item", {
    p_user_id: user.id,
    p_item_id: parsed.data.itemId,
    p_quantity: parsed.data.quantity,
  });

  if (error) {
    // Parse friendly error messages from the PG function
    const msg = error.message;
    if (msg.includes("Insufficient balance")) {
      return { error: "You don't have enough Alt-F4 Bucks for this purchase." };
    }
    if (msg.includes("Insufficient stock")) {
      return { error: "This item is out of stock." };
    }
    if (msg.includes("not found")) {
      return { error: "This item is no longer available." };
    }
    return { error: msg };
  }

  revalidatePath("/store");
  revalidatePath("/dashboard");
  revalidatePath("/");

  return { success: true, purchaseId: data };
}
