-- Add team_number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_number text;

-- Grant 10000 AF4 to anyone who doesn't have a bonus yet
INSERT INTO transactions (type, amount, to_user_id, reason, category)
SELECT 'award', 10000, id, 'Welcome bonus — 10,000 AF4 to get started', 'bonus'
FROM profiles
WHERE id NOT IN (
  SELECT to_user_id FROM transactions WHERE category = 'bonus'
);
