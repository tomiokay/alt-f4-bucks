import { createClient } from "@/lib/supabase/server";
import type { TransactionWithProfiles } from "@/lib/types";

export async function getUserTransactions(
  userId: string,
  limit = 20
): Promise<TransactionWithProfiles[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select(
      `
      *,
      to_user:profiles!transactions_to_user_id_fkey(display_name),
      by_user:profiles!transactions_by_user_id_fkey(display_name)
    `
    )
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as TransactionWithProfiles[];
}

export async function getAllTransactions(
  limit = 50,
  offset = 0,
  filters?: {
    type?: string;
    category?: string;
    userId?: string;
  }
): Promise<{ data: TransactionWithProfiles[]; count: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      `
      *,
      to_user:profiles!transactions_to_user_id_fkey(display_name),
      by_user:profiles!transactions_by_user_id_fkey(display_name)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.userId) {
    query = query.eq("to_user_id", filters.userId);
  }

  const { data, count } = await query;

  return {
    data: (data ?? []) as TransactionWithProfiles[],
    count: count ?? 0,
  };
}

export async function getUserBalance(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leaderboard_view")
    .select("balance")
    .eq("user_id", userId)
    .single();

  return data?.balance ?? 0;
}
