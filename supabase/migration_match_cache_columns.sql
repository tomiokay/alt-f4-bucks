-- Add missing columns to match_cache
ALTER TABLE public.match_cache ADD COLUMN IF NOT EXISTS red_auto_points integer;
ALTER TABLE public.match_cache ADD COLUMN IF NOT EXISTS blue_auto_points integer;
ALTER TABLE public.match_cache ADD COLUMN IF NOT EXISTS red_rp integer;
ALTER TABLE public.match_cache ADD COLUMN IF NOT EXISTS blue_rp integer;
