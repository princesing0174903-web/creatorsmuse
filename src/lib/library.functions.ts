import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ----- Collections -----

const NameInput = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Name too long");

const HexOrHslColor = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .default("hsl(var(--primary))");

export const listCollections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: cols, error } = await supabase
      .from("library_collections")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: counts, error: cErr } = await supabase
      .from("library_asset_collections")
      .select("collection_id")
      .eq("user_id", userId);
    if (cErr) throw new Error(cErr.message);

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.collection_id, (countMap.get(row.collection_id) ?? 0) + 1);
    }

    return (cols ?? []).map((c) => ({
      ...c,
      asset_count: countMap.get(c.id) ?? 0,
    }));
  });

const CreateCollectionInput = z.object({
  name: NameInput,
  description: z.string().max(500).nullish(),
  color: HexOrHslColor.optional(),
  icon: z.string().trim().min(1).max(40).default("folder"),
});

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateCollectionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("library_collections")
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? "hsl(var(--primary))",
        icon: data.icon,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const UpdateCollectionInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    name: NameInput.optional(),
    description: z.string().max(500).nullish(),
    color: HexOrHslColor.optional(),
    icon: z.string().trim().min(1).max(40).optional(),
    sort_order: z.number().int().optional(),
  }),
});

export const updateCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateCollectionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("library_collections")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const IdInput = z.object({ id: z.string().uuid() });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("library_collections")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Membership -----

const MembershipInput = z.object({
  collectionId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1).max(500),
});

export const addAssetsToCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MembershipInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: col, error: colErr } = await supabase
      .from("library_collections")
      .select("id")
      .eq("id", data.collectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (colErr) throw new Error(colErr.message);
    if (!col) throw new Error("Collection not found");

    const { data: assets, error: aErr } = await supabase
      .from("library_assets")
      .select("id")
      .in("id", data.assetIds)
      .eq("user_id", userId);
    if (aErr) throw new Error(aErr.message);
    const validIds = (assets ?? []).map((a) => a.id);
    if (!validIds.length) return { added: 0 };

    const rows = validIds.map((asset_id) => ({
      collection_id: data.collectionId,
      asset_id,
      user_id: userId,
    }));
    const { error } = await supabase
      .from("library_asset_collections")
      .upsert(rows, { onConflict: "collection_id,asset_id" });
    if (error) throw new Error(error.message);
    return { added: rows.length };
  });

export const removeAssetsFromCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MembershipInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("library_asset_collections")
      .delete()
      .eq("collection_id", data.collectionId)
      .eq("user_id", userId)
      .in("asset_id", data.assetIds);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAssetCollections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("library_asset_collections")
      .select("collection_id")
      .eq("asset_id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.collection_id);
  });

// ----- Bulk asset actions -----

const AssetIdsInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

const BulkPatchInput = AssetIdsInput.extend({
  patch: z.object({
    favorite: z.boolean().optional(),
    archived: z.boolean().optional(),
    pinned: z.boolean().optional(),
    project_id: z.string().uuid().nullish(),
  }),
});

export const bulkUpdateAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BulkPatchInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (Object.keys(data.patch).length === 0) return { updated: 0 };
    const { data: rows, error } = await supabase
      .from("library_assets")
      .update(data.patch)
      .in("id", data.ids)
      .eq("user_id", userId)
      .select("id");
    if (error) throw new Error(error.message);
    return { updated: (rows ?? []).length };
  });

const BulkTagInput = AssetIdsInput.extend({
  add: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  remove: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const bulkTagAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BulkTagInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.add.length && !data.remove.length) return { updated: 0 };

    const { data: existing, error: fetchErr } = await supabase
      .from("library_assets")
      .select("id, tags")
      .in("id", data.ids)
      .eq("user_id", userId);
    if (fetchErr) throw new Error(fetchErr.message);

    let updated = 0;
    for (const row of existing ?? []) {
      const set = new Set<string>(row.tags ?? []);
      for (const t of data.remove) set.delete(t);
      for (const t of data.add) set.add(t);
      const next = Array.from(set).slice(0, 30);
      const { error } = await supabase
        .from("library_assets")
        .update({ tags: next })
        .eq("id", row.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      updated += 1;
    }
    return { updated };
  });

export const moveAssetsToTrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssetIdsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("library_assets")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", data.ids)
      .eq("user_id", userId)
      .select("id");
    if (error) throw new Error(error.message);
    return { trashed: (rows ?? []).length };
  });

export const restoreAssetsFromTrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssetIdsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("library_assets")
      .update({ deleted_at: null })
      .in("id", data.ids)
      .eq("user_id", userId)
      .select("id");
    if (error) throw new Error(error.message);
    return { restored: (rows ?? []).length };
  });

export const purgeAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssetIdsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("library_assets")
      .delete()
      .in("id", data.ids)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const emptyTrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("library_assets")
      .delete()
      .eq("user_id", userId)
      .not("deleted_at", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Tag catalog -----

export const listAllTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("library_assets")
      .select("tags")
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      for (const t of row.tags ?? []) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 60);
  });