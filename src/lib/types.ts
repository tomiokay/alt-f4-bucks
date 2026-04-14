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

// --- Betting (Pool / Parimutuel) ---

export type BetSide = "red" | "blue";

export type PoolBet = {
  id: string;
  user_id: string;
  match_key: string;
  side: BetSide;
  amount: number;
  payout: number | null;
  created_at: string;
};

export type PoolBetWithProfile = PoolBet & {
  user: Pick<Profile, "display_name"> | null;
};

export type MatchCache = {
  match_key: string;
  event_key: string;
  event_name: string;
  comp_level: string;
  match_number: number;
  red_teams: string[];
  blue_teams: string[];
  scheduled_time: string | null;
  actual_time: string | null;
  red_score: number | null;
  blue_score: number | null;
  winning_alliance: string | null;
  is_complete: boolean;
  fetched_at: string;
};

export type PoolSummary = {
  match_key: string;
  red_pool: number;
  blue_pool: number;
  total_pool: number;
  red_bettors: number;
  blue_bettors: number;
  total_bettors: number;
};

export type Comment = {
  id: string;
  user_id: string;
  match_key: string;
  body: string;
  parent_id: string | null;
  created_at: string;
};

export type CommentWithProfile = Comment & {
  user: Pick<Profile, "display_name"> | null;
  replies?: CommentWithProfile[];
};

export type MatchOdds = {
  redPct: number;
  bluePct: number;
  redPool: number;
  bluePool: number;
  totalPool: number;
  redBettors: number;
  blueBettors: number;
  statboticsRedPct: number | null;
  statboticsBluePct: number | null;
};
