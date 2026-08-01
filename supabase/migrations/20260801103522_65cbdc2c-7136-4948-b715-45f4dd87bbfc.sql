-- ============ Extensions ============
create extension if not exists vector;

-- ============ 1. Brand profiles (multi-brand memory) ============
CREATE TABLE public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  mission text,
  vision text,
  target_audience text,
  tone text,
  writing_style text,
  cta_style text,
  emoji_rules text not null default 'sparing',
  formatting_preferences text,
  reading_level text,
  primary_color text,
  accent_color text,
  logo_url text,
  vocabulary text[] not null default '{}'::text[],
  hashtags text[] not null default '{}'::text[],
  competitors text[] not null default '{}'::text[],
  content_pillars text[] not null default '{}'::text[],
  keywords text[] not null default '{}'::text[],
  banned_words text[] not null default '{}'::text[],
  approved_phrases text[] not null default '{}'::text[],
  platform_rules jsonb not null default '{}'::jsonb,
  learned_insights jsonb not null default '{}'::jsonb,
  links jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  memory_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_profiles TO authenticated;
GRANT ALL ON public.brand_profiles TO service_role;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_profiles_owner_all ON public.brand_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX brand_profiles_user_idx ON public.brand_profiles(user_id, updated_at desc);
CREATE UNIQUE INDEX brand_profiles_one_default_idx ON public.brand_profiles(user_id) WHERE is_default;

CREATE TRIGGER brand_profiles_updated_at BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. Versioned memory ============
CREATE TABLE public.brand_memory_versions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brand_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  changed_fields text[] not null default '{}'::text[],
  change_source text not null default 'manual',
  note text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.brand_memory_versions TO authenticated;
GRANT ALL ON public.brand_memory_versions TO service_role;
ALTER TABLE public.brand_memory_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_memory_versions_owner_all ON public.brand_memory_versions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX brand_memory_versions_brand_idx ON public.brand_memory_versions(brand_id, version desc);

-- ============ 3. Knowledge base ============
CREATE TABLE public.brand_knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brand_profiles(id) on delete cascade,
  title text not null,
  source_type text not null default 'text',
  source_url text,
  mime_type text,
  byte_size integer,
  status text not null default 'pending',
  error text,
  chunk_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_knowledge_docs TO authenticated;
GRANT ALL ON public.brand_knowledge_docs TO service_role;
ALTER TABLE public.brand_knowledge_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_knowledge_docs_owner_all ON public.brand_knowledge_docs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX brand_knowledge_docs_brand_idx ON public.brand_knowledge_docs(user_id, brand_id, created_at desc);
CREATE TRIGGER brand_knowledge_docs_updated_at BEFORE UPDATE ON public.brand_knowledge_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.brand_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.brand_knowledge_docs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brand_profiles(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  token_estimate integer not null default 0,
  embedding vector(3072),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_knowledge_chunks TO authenticated;
GRANT ALL ON public.brand_knowledge_chunks TO service_role;
ALTER TABLE public.brand_knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_knowledge_chunks_owner_all ON public.brand_knowledge_chunks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX brand_knowledge_chunks_doc_idx ON public.brand_knowledge_chunks(doc_id, chunk_index);
CREATE INDEX brand_knowledge_chunks_embedding_idx
  ON public.brand_knowledge_chunks USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- Retrieval RPC (owner-scoped; runs as caller so RLS applies via explicit filter)
CREATE OR REPLACE FUNCTION public.match_brand_knowledge(
  p_user_id uuid,
  p_brand_id uuid,
  query_embedding vector(3072),
  match_count int default 6
)
RETURNS TABLE (id uuid, doc_id uuid, content text, similarity float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select c.id, c.doc_id, c.content,
         1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.brand_knowledge_chunks c
  where c.user_id = p_user_id
    and (p_brand_id is null or c.brand_id = p_brand_id)
    and c.embedding is not null
  order by c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count;
$$;
REVOKE ALL ON FUNCTION public.match_brand_knowledge(uuid, uuid, vector, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_brand_knowledge(uuid, uuid, vector, int) TO service_role;

-- ============ 4. Learning signals ============
CREATE TABLE public.brand_learning_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brand_profiles(id) on delete cascade,
  asset_id uuid references public.library_assets(id) on delete set null,
  generation_id uuid references public.generations(id) on delete set null,
  signal text not null,
  weight numeric not null default 1,
  asset_type text,
  original_text text,
  final_text text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.brand_learning_signals TO authenticated;
GRANT ALL ON public.brand_learning_signals TO service_role;
ALTER TABLE public.brand_learning_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_learning_signals_owner_all ON public.brand_learning_signals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX brand_learning_signals_user_idx ON public.brand_learning_signals(user_id, created_at desc);
CREATE INDEX brand_learning_signals_brand_idx ON public.brand_learning_signals(brand_id, signal, created_at desc);

-- ============ 5. Quality scores ============
CREATE TABLE public.generation_quality (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brand_profiles(id) on delete set null,
  brand_consistency integer not null default 0,
  tone_match integer not null default 0,
  grammar integer not null default 0,
  readability integer not null default 0,
  cta_quality integer not null default 0,
  platform_optimization integer not null default 0,
  overall integer not null default 0,
  notes text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_quality TO authenticated;
GRANT ALL ON public.generation_quality TO service_role;
ALTER TABLE public.generation_quality ENABLE ROW LEVEL SECURITY;
CREATE POLICY generation_quality_owner_all ON public.generation_quality
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX generation_quality_gen_idx ON public.generation_quality(generation_id);

-- ============ 6. Project → brand link ============
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brand_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS projects_brand_idx ON public.projects(brand_id);