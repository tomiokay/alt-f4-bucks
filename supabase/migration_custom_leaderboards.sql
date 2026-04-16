-- Custom leaderboards: users can create groups and invite members
CREATE TABLE IF NOT EXISTS public.custom_leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_leaderboard_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id uuid REFERENCES public.custom_leaderboards(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(leaderboard_id, user_id)
);

-- RLS
ALTER TABLE public.custom_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_leaderboard_members ENABLE ROW LEVEL SECURITY;

-- Anyone can read leaderboards they're a member of
CREATE POLICY "Members can view their leaderboards" ON public.custom_leaderboards
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT leaderboard_id FROM public.custom_leaderboard_members WHERE user_id = (SELECT auth.uid()))
    OR created_by = (SELECT auth.uid())
  );

-- Creator can update/delete
CREATE POLICY "Creator can manage leaderboard" ON public.custom_leaderboards
  FOR ALL TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- Members can read membership
CREATE POLICY "Members can view membership" ON public.custom_leaderboard_members
  FOR SELECT TO authenticated
  USING (
    leaderboard_id IN (
      SELECT leaderboard_id FROM public.custom_leaderboard_members WHERE user_id = (SELECT auth.uid())
    )
  );

-- Users can insert themselves (for accepting invites)
CREATE POLICY "Users can join" ON public.custom_leaderboard_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can remove themselves
CREATE POLICY "Users can leave" ON public.custom_leaderboard_members
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Creator can manage members
CREATE POLICY "Creator can manage members" ON public.custom_leaderboard_members
  FOR ALL TO authenticated
  USING (
    leaderboard_id IN (
      SELECT id FROM public.custom_leaderboards WHERE created_by = (SELECT auth.uid())
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_leaderboards TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.custom_leaderboard_members TO authenticated;
