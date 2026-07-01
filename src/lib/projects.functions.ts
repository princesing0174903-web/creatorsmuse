import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// --------------- Schemas ---------------

const ProjectType = z.enum(["general", "reel", "workflow", "campaign"]);
const Status = z.enum(["draft", "active", "paused", "completed", "archived"]);
const Priority = z.enum(["low", "medium", "high", "urgent"]);
const Platform = z.enum([
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "multi",
  "other",
]);

const ProjectPayload = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).nullish(),
  type: ProjectType.default("general"),
  status: Status.default("active"),
  priority: Priority.default("medium"),
  platform: Platform.default("multi"),
  category: z.string().max(80).nullish(),
  color: z.string().max(80).default("from-violet-500 to-fuchsia-500"),
  icon: z.string().max(40).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  thumbnail_url: z.string().url().max(1024).nullish(),
  progress: z.number().int().min(0).max(100).default(0),
  estimated_completion: z.string().nullish(), // ISO date (YYYY-MM-DD)
  favorite: z.boolean().default(false),
});

const ListInput = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["any", ...Status.options]).default("any"),
  platform: z.enum(["any", ...Platform.options]).default("any"),
  priority: z.enum(["any", ...Priority.options]).default("any"),
  type: z.enum(["any", ...ProjectType.options]).default("any"),
  favoritesOnly: z.boolean().default(false),
  archived: z.enum(["active", "archived", "all"]).default("active"),
  sort: z
    .enum([
      "updated_desc",
      "updated_asc",
      "created_desc",
      "created_asc",
      "name_asc",
      "name_desc",
      "progress_desc",
    ])
    .default("updated_desc"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const IdInput = z.object({ id: z.string().uuid() });

const UpdateInput = z.object({
  id: z.string().uuid(),
  patch: ProjectPayload.partial(),
});

// --------------- Server functions ---------------

export const listMyProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("projects")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (data.archived === "active") q = q.eq("archived", false);
    else if (data.archived === "archived") q = q.eq("archived", true);

    if (data.status !== "any") q = q.eq("status", data.status);
    if (data.platform !== "any") q = q.eq("platform", data.platform);
    if (data.priority !== "any") q = q.eq("priority", data.priority);
    if (data.type !== "any") q = q.eq("type", data.type);
    if (data.favoritesOnly) q = q.eq("favorite", true);

    const s = data.search.trim();
    if (s) {
      // Search across name / description / category. Tags handled separately.
      const like = `%${s.replace(/[%_]/g, "\\$&")}%`;
      q = q.or(
        [
          `name.ilike.${like}`,
          `description.ilike.${like}`,
          `category.ilike.${like}`,
        ].join(","),
      );
    }

    const sortMap: Record<string, { col: string; asc: boolean }> = {
      updated_desc: { col: "updated_at", asc: false },
      updated_asc: { col: "updated_at", asc: true },
      created_desc: { col: "created_at", asc: false },
      created_asc: { col: "created_at", asc: true },
      name_asc: { col: "name", asc: true },
      name_desc: { col: "name", asc: false },
      progress_desc: { col: "progress", asc: false },
    };
    const { col, asc } = sortMap[data.sort];
    q = q.order("favorite", { ascending: false }).order(col, { ascending: asc });
    q = q.range(data.offset, data.offset + data.limit - 1);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProjectPayload.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("projects")
      .insert({ ...data, user_id: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("projects")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: src, error: fetchErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (fetchErr || !src) throw new Error(fetchErr?.message ?? "Not found");
    const {
      id: _id,
      created_at: _c,
      updated_at: _u,
      favorite: _f,
      ...rest
    } = src;
    void _id;
    void _c;
    void _u;
    void _f;
    const { data: row, error } = await supabase
      .from("projects")
      .insert({ ...rest, name: `${src.name} (copy)`, favorite: false, user_id: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getProjectStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [gens, assets, latestAsset] = await Promise.all([
      supabase
        .from("generations")
        .select("kind", { count: "exact" })
        .eq("user_id", userId)
        .eq("project_id", data.id),
      supabase
        .from("library_assets")
        .select("asset_type", { count: "exact" })
        .eq("user_id", userId)
        .eq("project_id", data.id),
      supabase
        .from("library_assets")
        .select("updated_at")
        .eq("user_id", userId)
        .eq("project_id", data.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const bucket = <T extends string>(rows: { [k: string]: unknown }[] | null, key: string) => {
      const out: Record<T, number> = {} as Record<T, number>;
      for (const r of rows ?? []) {
        const k = (r[key] as T) ?? ("other" as T);
        out[k] = (out[k] ?? 0) + 1;
      }
      return out;
    };

    return {
      totalGenerations: gens.count ?? 0,
      generationsByKind: bucket(gens.data, "kind"),
      totalAssets: assets.count ?? 0,
      assetsByType: bucket(assets.data, "asset_type"),
      lastActivity: latestAsset.data?.updated_at ?? null,
    };
  });