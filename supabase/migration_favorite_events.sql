-- Favorite events: users can pin events to always show up
CREATE TABLE IF NOT EXISTS public.favorite_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  event_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_key)
);

ALTER TABLE public.favorite_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their favorites" ON public.favorite_events
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.favorite_events TO authenticated;
