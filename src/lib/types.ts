export type Role = "member" | "manager" | "admin";

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  created_at: string;
};

export type TransactionType = "award" | "purchase" | "adjustment";

export type Transaction = {
  id: string;
  created_at: string;
  type: TransactionType;
  amount: number;
  to_user_id: string;
  by_user_id: string | null;
  reason: string | null;
  category: string | null;
  meta: Record<string, unknown>;
};

export type TransactionWithProfiles = Transaction & {
  to_user: Pick<Profile, "display_name"> | null;
  by_user: Pick<Profile, "display_name"> | null;
};

export type StoreItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  stock: number | null;
  image_url: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  total_price: number;
  created_at: string;
  status: string;
};

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  balance: number;
};
