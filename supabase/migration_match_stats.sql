-- =============================================================
-- Alt-F4 Bucks — Match Stats Migration
-- Adds auto scores, RPs, and total points to match_cache
-- Run in Supabase SQL Editor
-- =============================================================

ALTER TABLE public.match_cache
  ADD COLUMN IF NOT EXISTS red_auto_points integer,
  ADD COLUMN IF NOT EXISTS blue_auto_points integer,
  ADD COLUMN IF NOT EXISTS red_rp integer,
  ADD COLUMN IF NOT EXISTS blue_rp integer;
