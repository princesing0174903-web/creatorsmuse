
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.projects
  ADD COLUMN status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','paused','completed','archived')),
  ADD COLUMN priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  ADD COLUMN platform text NOT NULL DEFAULT 'multi'
    CHECK (platform IN ('instagram','tiktok','youtube','x','linkedin','multi','other')),
  ADD COLUMN category text,
  ADD COLUMN tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN thumbnail_url text,
  ADD COLUMN progress integer NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN estimated_completion date,
  ADD COLUMN favorite boolean NOT NULL DEFAULT false;

CREATE INDEX projects_user_status_idx ON public.projects(user_id, status);
CREATE INDEX projects_user_favorite_idx ON public.projects(user_id, favorite) WHERE favorite = true;
CREATE INDEX projects_tags_gin_idx ON public.projects USING gin(tags);
CREATE INDEX projects_name_trgm_idx ON public.projects USING gin(name gin_trgm_ops);
