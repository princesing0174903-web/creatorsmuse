import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// ---------- Generations ----------

const ListGenerationsInput = z.object({
  projectId: z.string().uuid().nullish(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const listMyGenerations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListGenerationsInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("generations")
      .select("id,kind,topic,model,project_id,parent_id,created_at,updated_at,status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const IdInput = z.object({ id: z.string().uuid() });

export const getGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("generations")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Library assets ----------

const AssetType = z.enum([
  "hook","caption","post","short","reel","cover","note","title","script",
  "reel_idea","cta","hashtag","content_plan","other",
]);

const ListAssetsInput = z.object({
  search: z.string().trim().max(200).default(""),
  types: z.array(AssetType).default([]),
  projectId: z.string().uuid().nullish(),
  collectionId: z.string().uuid().nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  favoritesOnly: z.boolean().default(false),
  archived: z.enum(["active", "archived", "trash", "all"]).default("active"),
  sort: z.enum(["created_desc", "created_asc", "updated_desc"]).default("created_desc"),
  limit: z.number().int().min(1).max(200).default(60),
  offset: z.number().int().min(0).default(0),
});

export const listMyAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListAssetsInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("library_assets")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (data.archived === "active") {
      q = q.eq("archived", false).is("deleted_at", null);
    } else if (data.archived === "archived") {
      q = q.eq("archived", true).is("deleted_at", null);
    } else if (data.archived === "trash") {
      q = q.not("deleted_at", "is", null);
    }

    if (data.favoritesOnly) q = q.eq("favorite", true);
    if (data.types.length) q = q.in("asset_type", data.types);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.tags.length) q = q.contains("tags", data.tags);

    if (data.collectionId) {
      const { data: linkRows, error: linkErr } = await supabase
        .from("library_asset_collections")
        .select("asset_id")
        .eq("collection_id", data.collectionId)
        .eq("user_id", userId);
      if (linkErr) throw new Error(linkErr.message);
      const ids = (linkRows ?? []).map((r) => r.asset_id);
      if (!ids.length) return { rows: [], total: 0 };
      q = q.in("id", ids);
    }

    const s = data.search.trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, "\\$&")}%`;
      q = q.or(`content.ilike.${like},title.ilike.${like}`);
    }

    const sortMap = {
      created_desc: { col: "created_at", asc: false },
      created_asc: { col: "created_at", asc: true },
      updated_desc: { col: "updated_at", asc: false },
    } as const;
    const { col, asc } = sortMap[data.sort];
    q = q
      .order("pinned", { ascending: false })
      .order(col, { ascending: asc })
      .range(data.offset, data.offset + data.limit - 1);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

const AssetPatch = z.object({
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
  pinned: z.boolean().optional(),
  title: z.string().max(200).nullish(),
  content: z.string().max(10000).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  project_id: z.string().uuid().nullish(),
});

const UpdateAssetInput = z.object({ id: z.string().uuid(), patch: AssetPatch });

export const updateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateAssetInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Capture the pre-edit text so the learning engine can diff it.
    const { data: before } = await supabase
      .from("library_assets")
      .select("content, asset_type")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    const { data: row, error } = await supabase
      .from("library_assets")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // --- Learning signals (best-effort; never blocks the write). ---
    const signals: Array<{ signal: string; original?: string; final?: string }> = [];
    if (
      typeof data.patch.content === "string" &&
      before?.content &&
      data.patch.content !== before.content
    ) {
      signals.push({ signal: "edit", original: before.content, final: data.patch.content });
    }
    if (data.patch.favorite === true) signals.push({ signal: "favorite", final: row.content ?? "" });
    if (data.patch.pinned === true) signals.push({ signal: "pin", final: row.content ?? "" });
    if (data.patch.archived === true) signals.push({ signal: "archive", final: row.content ?? "" });
    if (signals.length) {
      const { error: sErr } = await supabase.from("brand_learning_signals").insert(
        signals.map((s) => ({
          user_id: userId,
          asset_id: data.id,
          generation_id: row.generation_id,
          signal: s.signal,
          asset_type: (before?.asset_type as string | null) ?? row.asset_type,
          original_text: s.original?.slice(0, 4000) ?? null,
          final_text: s.final?.slice(0, 4000) ?? null,
        })),
      );
      if (sErr) console.error("Learning signal failed (non-fatal):", sErr.message);
    }
    return row;
  });

export const deleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: before } = await supabase
      .from("library_assets")
      .select("content, asset_type")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    const { error } = await supabase
      .from("library_assets")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (before?.content) {
      await supabase.from("brand_learning_signals").insert({
        user_id: userId,
        signal: "delete",
        asset_type: before.asset_type,
        original_text: before.content.slice(0, 4000),
      });
    }
    return { ok: true };
  });

export const duplicateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: src, error: fetchErr } = await supabase
      .from("library_assets")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (fetchErr || !src) throw new Error(fetchErr?.message ?? "Not found");
    const insert = {
      user_id: userId,
      project_id: src.project_id,
      generation_id: src.generation_id,
      asset_type: src.asset_type,
      content: src.content,
      title: src.title ? `${src.title} (copy)` : null,
      scores: src.scores as Json,
      tags: src.tags,
      metadata: src.metadata as Json,
      favorite: false,
      archived: false,
    };
    const { data: row, error } = await supabase
      .from("library_assets")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Preferences ----------

export const getWorkbenchPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_preferences")
      .select("preferences, default_project_id")
      .eq("user_id", userId)
      .maybeSingle();
    const prefs = (data?.preferences ?? {}) as Record<string, unknown>;
    return {
      lastProjectId: (prefs.last_project_id as string | null) ?? data?.default_project_id ?? null,
      lastTopic: (prefs.last_topic as string | null) ?? null,
      lastGeneratedAt: (prefs.last_generated_at as string | null) ?? null,
    };
  });