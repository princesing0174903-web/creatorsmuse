-- Phase 4: AI Generation Pipeline — jobs lifecycle, events audit, drafts, realtime.

-- 1) Expand generations for pipeline lifecycle.
ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_status_check;
ALTER TABLE public.generations
  ADD CONSTRAINT generations_status_check
  CHECK (status IN ('queued','processing','complete','failed','cancelled','pending'));

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN IF NOT EXISTS queued_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS generations_user_status_idx ON public.generations(user_id, status);

-- 2) Generation events (audit trail).
CREATE TABLE IF NOT EXISTS public.generation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('queued','started','progress','completed','failed','cancel_requested','cancelled','retried')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_events TO authenticated;
GRANT ALL ON public.generation_events TO service_role;
ALTER TABLE public.generation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generation_events_owner_all" ON public.generation_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS generation_events_gen_idx ON public.generation_events(generation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generation_events_user_idx ON public.generation_events(user_id, created_at DESC);

-- 3) Autosave drafts on user_preferences.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS drafts jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4) Enable realtime for generations + events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_events;
