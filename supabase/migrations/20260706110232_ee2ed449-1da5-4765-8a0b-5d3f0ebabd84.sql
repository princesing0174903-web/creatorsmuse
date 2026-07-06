
-- 1) library_collections
CREATE TABLE public.library_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'hsl(var(--primary))',
  icon TEXT NOT NULL DEFAULT 'folder',
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT library_collections_name_len CHECK (char_length(name) BETWEEN 1 AND 80)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_collections TO authenticated;
GRANT ALL ON public.library_collections TO service_role;

ALTER TABLE public.library_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collections"
  ON public.library_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX library_collections_user_idx ON public.library_collections (user_id, sort_order, created_at DESC);

CREATE TRIGGER update_library_collections_updated_at
  BEFORE UPDATE ON public.library_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) library_asset_collections (join)
CREATE TABLE public.library_asset_collections (
  collection_id UUID NOT NULL REFERENCES public.library_collections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.library_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, asset_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_asset_collections TO authenticated;
GRANT ALL ON public.library_asset_collections TO service_role;

ALTER TABLE public.library_asset_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own asset-collection links"
  ON public.library_asset_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX library_asset_collections_asset_idx ON public.library_asset_collections (asset_id);
CREATE INDEX library_asset_collections_collection_idx ON public.library_asset_collections (collection_id, added_at DESC);
CREATE INDEX library_asset_collections_user_idx ON public.library_asset_collections (user_id);

-- 3) Extend library_assets: soft delete + pinned
ALTER TABLE public.library_assets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

-- 4) Performance indexes for library search & filter
CREATE INDEX IF NOT EXISTS library_assets_user_state_idx
  ON public.library_assets (user_id, archived, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS library_assets_user_type_idx
  ON public.library_assets (user_id, asset_type);

CREATE INDEX IF NOT EXISTS library_assets_user_favorite_idx
  ON public.library_assets (user_id, favorite) WHERE favorite = true;

CREATE INDEX IF NOT EXISTS library_assets_user_pinned_idx
  ON public.library_assets (user_id, pinned) WHERE pinned = true;

CREATE INDEX IF NOT EXISTS library_assets_user_project_idx
  ON public.library_assets (user_id, project_id);

CREATE INDEX IF NOT EXISTS library_assets_tags_idx
  ON public.library_assets USING GIN (tags);
