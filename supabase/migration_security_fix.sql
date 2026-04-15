-- =============================================================
-- Alt-F4 Bucks — Security Fix Migration
-- IMPORTANT: Run this in Supabase SQL Editor
-- Fixes critical RLS vulnerabilities
-- =============================================================

-- FIX 1: Remove the ability for users to insert positive purchase transactions
-- The purchase_item RPC is security definer and bypasses RLS, so users
-- should never insert purchase transactions directly.
DROP POLICY IF EXISTS "Managers can insert award/adjustment transactions" ON public.transactions;

CREATE POLICY "Controlled transaction inserts"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Managers can insert awards/adjustments
    (type IN ('award', 'adjustment') AND public.is_manager_or_admin())
    -- Regular users can only insert negative purchase transactions (handled by RPC, but just in case)
    OR (type = 'purchase' AND amount < 0)
  );

-- FIX 2: Remove direct insert on pool_bets
-- The place_pool_bet RPC is security definer and handles all validation.
-- Users should never insert pool_bets directly.
DROP POLICY IF EXISTS "Users can place pool bets" ON public.pool_bets;

-- No insert policy = users cannot insert directly. The security definer RPC still works.
