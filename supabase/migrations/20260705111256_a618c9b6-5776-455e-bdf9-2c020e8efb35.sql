
-- Extend workflow_cards with production fields
ALTER TABLE public.workflow_cards
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'multi',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Enforce value domains
DO $$ BEGIN
  ALTER TABLE public.workflow_cards
    ADD CONSTRAINT workflow_cards_priority_chk
    CHECK (priority IN ('low','medium','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.workflow_cards
    ADD CONSTRAINT workflow_cards_status_chk
    CHECK (status IN ('active','blocked','in_progress','review','done','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.workflow_cards
    ADD CONSTRAINT workflow_cards_platform_chk
    CHECK (platform IN ('instagram','tiktok','youtube','x','linkedin','multi','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.workflow_cards
    ADD CONSTRAINT workflow_cards_progress_chk
    CHECK (progress BETWEEN 0 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS workflow_cards_user_updated_idx
  ON public.workflow_cards(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS workflow_cards_user_status_idx
  ON public.workflow_cards(user_id, status);
CREATE INDEX IF NOT EXISTS workflow_cards_user_priority_idx
  ON public.workflow_cards(user_id, priority);
CREATE INDEX IF NOT EXISTS workflow_cards_user_platform_idx
  ON public.workflow_cards(user_id, platform);
CREATE INDEX IF NOT EXISTS workflow_cards_project_idx
  ON public.workflow_cards(project_id);
CREATE INDEX IF NOT EXISTS workflow_cards_due_idx
  ON public.workflow_cards(user_id, due_date);
CREATE INDEX IF NOT EXISTS workflow_cards_tags_gin_idx
  ON public.workflow_cards USING gin(tags);

-- Widen default workflow stages template
ALTER TABLE public.workflows
  ALTER COLUMN stages SET DEFAULT
  '["idea","research","script","recording","editing","ai_generation","review","approval","scheduled","published"]'::jsonb;

-- ---------- WORKFLOW EVENTS (audit log) ----------
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.workflow_cards(id) ON DELETE CASCADE,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_events TO authenticated;
GRANT ALL ON public.workflow_events TO service_role;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "workflow_events_owner_all" ON public.workflow_events
    FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS workflow_events_card_idx
  ON public.workflow_events(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_events_workflow_idx
  ON public.workflow_events(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_events_user_idx
  ON public.workflow_events(user_id, created_at DESC);

-- ---------- Enable Realtime ----------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_cards;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workflows;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.workflow_cards REPLICA IDENTITY FULL;
ALTER TABLE public.workflows REPLICA IDENTITY FULL;
