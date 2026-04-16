export type Role = "member" | "manager" | "admin";

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  team_number: string | null;
  banned: boolean;
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
  team_number: string | null;
  balance: number;
  betting_pnl?: number;
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
  red_auto_points: number | null;
  blue_auto_points: number | null;
  red_rp: number | null;
  blue_rp: number | null;
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

export type NotificationType = "bet_won" | "bet_lost" | "bet_refund" | "comment_reply" | "welcome" | "leaderboard_invite";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  meta: Record<string, unknown>;
  created_at: string;
};

// --- Prediction Markets ---

export type PredictionMarketType = "score_over_under" | "score_prediction" | "event_winner" | "ranking_top1" | "ranking_top8" | "ranking_position" | "custom";

export type PredictionMarketOption = {
  key: string;
  label: string;
};

export type PredictionMarket = {
  id: string;
  event_key: string;
  match_key: string | null;
  type: PredictionMarketType;
  title: string;
  description: string | null;
  options: PredictionMarketOption[];
  line: number | null;
  correct_option: string | null;
  actual_value: number | null;
  status: "open" | "closed" | "resolved" | "voided";
  is_custom: boolean;
  featured: boolean;
  created_at: string;
  resolved_at: string | null;
};

export type PredictionBet = {
  id: string;
  user_id: string;
  market_id: string;
  option_key: string;
  amount: number;
  payout: number | null;
  predicted_value: number | null;
  predicted_red: number | null;
  predicted_blue: number | null;
  created_at: string;
};

export type PredictionPoolOption = {
  market_id: string;
  option_key: string;
  pool: number;
  bettors: number;
};

// --- Custom Leaderboards ---

export type CustomLeaderboard = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type CustomLeaderboardMember = {
  id: string;
  leaderboard_id: string;
  user_id: string;
  joined_at: string;
};

export type OddsHistoryPoint = {
  id: string;
  match_key: string;
  red_pct: number;
  blue_pct: number;
  red_pool: number;
  blue_pool: number;
  total_pool: number;
  created_at: string;
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
