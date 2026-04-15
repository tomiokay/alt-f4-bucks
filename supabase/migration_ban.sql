-- Add banned column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean not null default false;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(banned) WHERE banned = true;
