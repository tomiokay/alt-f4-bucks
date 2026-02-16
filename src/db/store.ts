import { createClient } from "@/lib/supabase/server";
import type { StoreItem } from "@/lib/types";

export async function getActiveStoreItems(): Promise<StoreItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_items")
    .select("*")
    .eq("active", true)
    .order("price", { ascending: true });

  return (data ?? []) as StoreItem[];
}

export async function getAllStoreItems(): Promise<StoreItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_items")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as StoreItem[];
}

export async function getStoreItem(id: string): Promise<StoreItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_items")
    .select("*")
    .eq("id", id)
    .single();

  return data as StoreItem | null;
}
