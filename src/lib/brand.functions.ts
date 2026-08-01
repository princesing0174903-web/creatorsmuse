import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// ------------------------------------------------------------- schemas ----

const StrList = z.array(z.string().trim().min(1).max(120)).max(60);

const BrandFields = z.object({
  name: z.string().trim().min(1).max(80),
  mission: z.string().trim().max(1000).nullish(),
  vision: z.string().trim().max(1000).nullish(),
  target_audience: z.string().trim().max(1000).nullish(),
  tone: z.string().trim().max(500).nullish(),
  writing_style: z.string().trim().max(500).nullish(),
  cta_style: z.string().trim().max(500).nullish(),
  emoji_rules: z.enum(["none", "sparing", "expressive"]).default("sparing"),
  formatting_preferences: z.string().trim().max(500).nullish(),
  reading_level: z.string().trim().max(120).nullish(),
  primary_color: z.string().trim().max(40).nullish(),
  accent_color: z.string().trim().max(40).nullish(),
  logo_url: z.string().trim().max(600).nullish(),
  vocabulary: StrList.default([]),
  hashtags: StrList.default([]),
  competitors: StrList.default([]),
  content_pillars: StrList.default([]),
  keywords: StrList.default([]),
  banned_words: StrList.default([]),
  approved_phrases: StrList.default([]),
  platform_rules: z.record(z.string(), z.string().max(1000)).default({}),
});

const VERSIONED_FIELDS = [
  "name", "mission", "vision", "target_audience", "tone", "writing_style",
  "cta_style", "emoji_rules", "formatting_preferences", "reading_level",
  "vocabulary", "hashtags", "competitors", "content_pillars", "keywords",
  "banned_words", "approved_phrases", "platform_rules",
] as const;

// ------------------------------------------------------------- profiles ----

export const listBrands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BrandFields.partial({ emoji_rules: true }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("brand_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: row, error } = await supabase
      .from("brand_profiles")
      .insert({ ...data, user_id: userId, is_default: (count ?? 0) === 0 })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { invalidateBrandCache } = await import("./brand.server");
    invalidateBrandCache(userId);
    return row;
  });

const UpdateBrandInput = BrandFields.partial().extend({
  id: z.string().uuid(),
  note: z.string().trim().max(300).nullish(),
});

export const updateBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateBrandInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, note, ...patch } = data;

    const { data: prev, error: prevErr } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (prevErr || !prev) throw new Error("Brand not found");

    const changed = VERSIONED_FIELDS.filter((f) => {
      if (!(f in patch)) return false;
      return JSON.stringify((patch as Record<string, unknown>)[f]) !==
        JSON.stringify((prev as Record<string, unknown>)[f]);
    });

    if (changed.length) {
      await supabase.from("brand_memory_versions").insert({
        brand_id: id,
        user_id: userId,
        version: prev.memory_version as number,
        snapshot: prev as unknown as Json,
        changed_fields: changed as unknown as string[],
        change_source: "manual",
        note: note ?? null,
      });
    }

    const { data: row, error } = await supabase
      .from("brand_profiles")
      .update({
        ...patch,
        memory_version: changed.length
          ? (prev.memory_version as number) + 1
          : (prev.memory_version as number),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { invalidateBrandCache } = await import("./brand.server");
    invalidateBrandCache(userId);
    return row;
  });

export const setDefaultBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("brand_profiles")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
    const { error } = await supabase
      .from("brand_profiles")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const { invalidateBrandCache } = await import("./brand.server");
    invalidateBrandCache(userId);
    return { ok: true };
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("brand_profiles")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const { invalidateBrandCache } = await import("./brand.server");
    invalidateBrandCache(userId);
    return { ok: true };
  });

// ------------------------------------------------------------- versions ----

export const listBrandVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ brandId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("brand_memory_versions")
      .select("id, version, changed_fields, change_source, note, created_at")
      .eq("brand_id", data.brandId)
      .eq("user_id", context.userId)
      .order("version", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const restoreBrandVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ versionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ver, error } = await supabase
      .from("brand_memory_versions")
      .select("*")
      .eq("id", data.versionId)
      .eq("user_id", userId)
      .single();
    if (error || !ver) throw new Error("Version not found");

    const snap = ver.snapshot as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const f of VERSIONED_FIELDS) patch[f] = snap[f];

    const { data: current } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("id", ver.brand_id)
      .eq("user_id", userId)
      .single();
    if (current) {
      await supabase.from("brand_memory_versions").insert({
        brand_id: ver.brand_id,
        user_id: userId,
        version: current.memory_version as number,
        snapshot: current as unknown as Json,
        changed_fields: VERSIONED_FIELDS as unknown as string[],
        change_source: "restore",
        note: `Replaced by restore of v${ver.version}`,
      });
    }

    const { error: upErr } = await supabase
      .from("brand_profiles")
      .update({
        ...patch,
        memory_version: ((current?.memory_version as number) ?? 1) + 1,
      })
      .eq("id", ver.brand_id)
      .eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);

    const { invalidateBrandCache } = await import("./brand.server");
    invalidateBrandCache(userId);
    return { ok: true };
  });

// ------------------------------------------------------- knowledge base ----

const AddKnowledgeInput = z.object({
  brandId: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(400_000),
  sourceType: z.enum(["text", "pdf", "doc", "url", "guide"]).default("text"),
  sourceUrl: z.string().trim().max(1000).nullish(),
  mimeType: z.string().trim().max(120).nullish(),
});

export const addKnowledgeDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AddKnowledgeInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc, error } = await supabase
      .from("brand_knowledge_docs")
      .insert({
        user_id: userId,
        brand_id: data.brandId ?? null,
        title: data.title,
        source_type: data.sourceType,
        source_url: data.sourceUrl ?? null,
        mime_type: data.mimeType ?? null,
        byte_size: data.content.length,
        status: "processing",
      })
      .select("id")
      .single();
    if (error || !doc) throw new Error(error?.message ?? "Failed to store document");

    const { chunkText, embedTexts } = await import("./brand.server");
    const chunks = chunkText(data.content);

    try {
      const vectors = await embedTexts(chunks);
      const rows = chunks.map((c, i) => ({
        doc_id: doc.id,
        user_id: userId,
        brand_id: data.brandId ?? null,
        chunk_index: i,
        content: c,
        token_estimate: Math.ceil(c.length / 4),
        embedding: JSON.stringify(vectors[i]),
        metadata: { title: data.title } as Json,
      }));
      for (let i = 0; i < rows.length; i += 50) {
        const { error: cErr } = await supabase
          .from("brand_knowledge_chunks")
          .insert(rows.slice(i, i + 50) as never);
        if (cErr) throw new Error(cErr.message);
      }
      await supabase
        .from("brand_knowledge_docs")
        .update({ status: "ready", chunk_count: chunks.length, error: null })
        .eq("id", doc.id);
      return { id: doc.id, chunks: chunks.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ingestion failed";
      await supabase
        .from("brand_knowledge_docs")
        .update({ status: "failed", error: msg.slice(0, 500) })
        .eq("id", doc.id);
      throw new Error(msg);
    }
  });

export const listKnowledgeDocs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ brandId: z.string().uuid().nullish() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("brand_knowledge_docs")
      .select("id, title, source_type, source_url, status, chunk_count, error, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.brandId) q = q.eq("brand_id", data.brandId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteKnowledgeDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("brand_knowledge_docs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------ learning signals ----

const SignalInput = z.object({
  signal: z.enum([
    "edit", "save", "favorite", "pin", "export", "publish",
    "approve", "delete", "trash", "reject", "archive", "regenerate",
  ]),
  brandId: z.string().uuid().nullish(),
  assetId: z.string().uuid().nullish(),
  generationId: z.string().uuid().nullish(),
  assetType: z.string().trim().max(40).nullish(),
  originalText: z.string().max(4000).nullish(),
  finalText: z.string().max(4000).nullish(),
  weight: z.number().min(0).max(10).default(1),
});

export const recordSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SignalInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("brand_learning_signals").insert({
      user_id: context.userId,
      brand_id: data.brandId ?? null,
      asset_id: data.assetId ?? null,
      generation_id: data.generationId ?? null,
      signal: data.signal,
      weight: data.weight,
      asset_type: data.assetType ?? null,
      original_text: data.originalText ?? null,
      final_text: data.finalText ?? null,
    });
    if (error) console.error("recordSignal failed (non-fatal):", error.message);
    return { ok: true };
  });

/** Aggregate view for the Brand Brain dashboard: signal counts + quality trend. */
export const getBrandIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ brandId: z.string().uuid().nullish() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let sq = supabase
      .from("brand_learning_signals")
      .select("signal")
      .eq("user_id", userId)
      .limit(1000);
    if (data.brandId) sq = sq.eq("brand_id", data.brandId);
    const { data: signals } = await sq;

    const counts: Record<string, number> = {};
    for (const s of (signals ?? []) as Array<{ signal: string }>) {
      counts[s.signal] = (counts[s.signal] ?? 0) + 1;
    }

    let qq = supabase
      .from("generation_quality")
      .select("overall, brand_consistency, tone_match, grammar, readability, cta_quality, platform_optimization, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data.brandId) qq = qq.eq("brand_id", data.brandId);
    const { data: quality } = await qq;

    const rows = (quality ?? []) as unknown as Array<Record<string, number>>;
    const avg = (k: string) =>
      rows.length ? Math.round(rows.reduce((a, r) => a + (r[k] ?? 0), 0) / rows.length) : 0;

    const { count: docCount } = await supabase
      .from("brand_knowledge_docs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      signalCounts: counts,
      totalSignals: (signals ?? []).length,
      knowledgeDocs: docCount ?? 0,
      quality: {
        samples: rows.length,
        overall: avg("overall"),
        brand_consistency: avg("brand_consistency"),
        tone_match: avg("tone_match"),
        grammar: avg("grammar"),
        readability: avg("readability"),
        cta_quality: avg("cta_quality"),
        platform_optimization: avg("platform_optimization"),
      },
      recent: rows.slice(0, 10).map((r) => ({ overall: r.overall ?? 0 })).reverse(),
    };
  });
