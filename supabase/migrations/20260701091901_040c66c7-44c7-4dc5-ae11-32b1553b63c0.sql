
-- =========================================================
-- DATA FOUNDATION MIGRATION
-- Creates: projects, generations, library_assets, workflows,
-- workflow_cards, brand_settings, user_preferences
-- =========================================================

-- Shared updated_at trigger already exists: public.update_updated_at_column()

-- ---------- PROJECTS ----------
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'general' CHECK (type IN ('general','reel','workflow','campaign')),
  color text NOT NULL DEFAULT 'violet',
  icon text,
  archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_owner_all" ON public.projects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX projects_user_updated_idx ON public.projects(user_id, updated_at DESC);
CREATE INDEX projects_user_archived_idx ON public.projects(user_id, archived);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- GENERATIONS ----------
-- Every AI generation call (assets/reels/studio) is persisted here.
CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('assets','reels','reel_studio','refine')),
  topic text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  credits_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'complete' CHECK (status IN ('pending','complete','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;
GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generations_owner_all" ON public.generations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX generations_user_created_idx ON public.generations(user_id, created_at DESC);
CREATE INDEX generations_project_idx ON public.generations(project_id);
CREATE INDEX generations_user_kind_idx ON public.generations(user_id, kind);
CREATE TRIGGER generations_set_updated_at BEFORE UPDATE ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- LIBRARY ASSETS ----------
-- Individual saved items (a hook, caption, tweet, shorts angle, cover, reel, etc.)
CREATE TABLE public.library_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  generation_id uuid REFERENCES public.generations(id) ON DELETE SET NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('hook','caption','post','short','reel','cover','note','other')),
  title text,
  content text,
  media_url text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  favorite boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_assets TO authenticated;
GRANT ALL ON public.library_assets TO service_role;
ALTER TABLE public.library_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library_assets_owner_all" ON public.library_assets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX library_user_created_idx ON public.library_assets(user_id, created_at DESC);
CREATE INDEX library_user_type_idx ON public.library_assets(user_id, asset_type);
CREATE INDEX library_project_idx ON public.library_assets(project_id);
CREATE INDEX library_generation_idx ON public.library_assets(generation_id);
CREATE INDEX library_user_favorite_idx ON public.library_assets(user_id, favorite) WHERE favorite = true;
CREATE INDEX library_tags_gin_idx ON public.library_assets USING gin(tags);
CREATE TRIGGER library_assets_set_updated_at BEFORE UPDATE ON public.library_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- WORKFLOWS ----------
CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Untitled workflow',
  description text,
  stages jsonb NOT NULL DEFAULT '["idea","script","reel","post"]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflows_owner_all" ON public.workflows
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX workflows_user_updated_idx ON public.workflows(user_id, updated_at DESC);
CREATE INDEX workflows_project_idx ON public.workflows(project_id);
CREATE TRIGGER workflows_set_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- WORKFLOW CARDS ----------
CREATE TABLE public.workflow_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'idea',
  title text NOT NULL,
  notes text,
  position integer NOT NULL DEFAULT 0,
  linked_asset_id uuid REFERENCES public.library_assets(id) ON DELETE SET NULL,
  linked_generation_id uuid REFERENCES public.generations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_cards TO authenticated;
GRANT ALL ON public.workflow_cards TO service_role;
ALTER TABLE public.workflow_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_cards_owner_all" ON public.workflow_cards
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX workflow_cards_workflow_stage_idx ON public.workflow_cards(workflow_id, stage, position);
CREATE INDEX workflow_cards_user_idx ON public.workflow_cards(user_id);
CREATE TRIGGER workflow_cards_set_updated_at BEFORE UPDATE ON public.workflow_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- BRAND SETTINGS ----------
CREATE TABLE public.brand_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text,
  niche text,
  tone text,
  target_audience text,
  keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  banned_words text[] NOT NULL DEFAULT ARRAY[]::text[],
  primary_color text,
  accent_color text,
  logo_url text,
  links jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_settings TO authenticated;
GRANT ALL ON public.brand_settings TO service_role;
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_settings_owner_all" ON public.brand_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER brand_settings_set_updated_at BEFORE UPDATE ON public.brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- USER PREFERENCES ----------
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
  email_notifications boolean NOT NULL DEFAULT true,
  product_updates boolean NOT NULL DEFAULT true,
  marketing_emails boolean NOT NULL DEFAULT false,
  default_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  onboarding_completed boolean NOT NULL DEFAULT false,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_owner_all" ON public.user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_preferences_set_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
