"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/db/profiles";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const storeItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0, "Price must be 0 or more"),
  stock: z.coerce.number().int().min(0).optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  active: z.coerce.boolean().optional(),
});

export async function createStoreItem(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const parsed = storeItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    stock: formData.get("stock") || null,
    imageUrl: formData.get("imageUrl") || "",
    active: formData.get("active") !== "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("store_items").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    price: parsed.data.price,
    stock: parsed.data.stock ?? null,
    image_url: parsed.data.imageUrl || null,
    active: parsed.data.active ?? true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/store");
  revalidatePath("/manager");

  return { success: true };
}

export async function updateStoreItem(itemId: string, formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const parsed = storeItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    stock: formData.get("stock") || null,
    imageUrl: formData.get("imageUrl") || "",
    active: formData.get("active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("store_items")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      stock: parsed.data.stock ?? null,
      image_url: parsed.data.imageUrl || null,
      active: parsed.data.active ?? true,
    })
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/store");
  revalidatePath("/manager");

  return { success: true };
}

export async function toggleStoreItem(itemId: string, active: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("store_items")
    .update({ active })
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/store");
  revalidatePath("/manager");

  return { success: true };
}
