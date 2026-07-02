
-- Loosen generations.kind to support all workbench generation types.
ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_kind_check;
ALTER TABLE public.generations
  ADD CONSTRAINT generations_kind_check
  CHECK (kind IN (
    'assets','hooks','captions','posts','shorts','titles','scripts',
    'reel_ideas','cta','hashtags','content_plan','reels','reel_studio','refine','other'
  ));

-- Loosen library_assets.asset_type to cover the full workbench catalog.
ALTER TABLE public.library_assets DROP CONSTRAINT IF EXISTS library_assets_asset_type_check;
ALTER TABLE public.library_assets
  ADD CONSTRAINT library_assets_asset_type_check
  CHECK (asset_type IN (
    'hook','caption','post','short','reel','cover','note','title','script',
    'reel_idea','cta','hashtag','content_plan','other'
  ));

-- Parent-child link for regeneration history.
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.generations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS generations_parent_idx ON public.generations(parent_id);

-- Full-text-ish helper: trigram on library content for library search.
CREATE INDEX IF NOT EXISTS library_content_trgm_idx
  ON public.library_assets USING gin (content extensions.gin_trgm_ops);
