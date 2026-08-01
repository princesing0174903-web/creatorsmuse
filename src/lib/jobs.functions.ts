import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  buildLibraryRows,
  callGenerateModel,
  GENERATE_MODEL_ID,
  type GeneratedAssets,
} from "./generate.functions";

// ---------- Types ----------

export type JobStatus = "queued" | "processing" | "complete" | "failed" | "cancelled";

// ---------- Enqueue ----------

const EnqueueInput = z.object({
  topic: z.string().trim().min(1).max(2000),
  fileName: z.string().trim().max(300).nullish(),
  projectId: z.string().uuid().nullish(),
  parentId: z.string().uuid().nullish(),
});

export const enqueueGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EnqueueInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Determine version from parent, if any.
    let version = 1;
    if (data.parentId) {
      const { data: parent } = await supabase
        .from("generations")
        .select("version")
        .eq("id", data.parentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (parent?.version) version = (parent.version as number) + 1;
    }

    const now = new Date().toISOString();
    const { data: gen, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        project_id: data.projectId ?? null,
        kind: "assets",
        topic: data.topic,
        input: { topic: data.topic, fileName: data.fileName ?? null } as Json,
        output: {} as Json,
        model: GENERATE_MODEL_ID,
        status: "queued",
        credits_used: 0,
        parent_id: data.parentId ?? null,
        progress: 0,
        queued_at: now,
        version,
      })
      .select("id")
      .single();
    if (error || !gen) throw new Error(error?.message ?? "Failed to enqueue");

    await supabase.from("generation_events").insert({
      generation_id: gen.id,
      user_id: userId,
      event: "queued",
      detail: { topic: data.topic } as Json,
    });

    // Kick off background execution (fire-and-forget).
    void runGenerationJob(gen.id).catch((e) => {
      console.error("runGenerationJob crashed:", gen.id, e);
    });

    return { generationId: gen.id };
  });

// ---------- Runner (internal, uses admin client) ----------

async function runGenerationJob(jobId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { consumeCredit } = await import("./usage.server");

  // Load job.
  const { data: job, error: loadErr } = await supabaseAdmin
    .from("generations")
    .select("*")
    .eq("id", jobId)
    .single();
  if (loadErr || !job) {
    console.error("Job not found:", jobId, loadErr);
    return;
  }
  if (job.status !== "queued") return; // already handled
  if (job.cancel_requested) {
    await finalize(jobId, job.user_id, "cancelled", { detail: { reason: "cancelled_before_start" } });
    return;
  }

  const input = (job.input ?? {}) as { topic?: string; fileName?: string | null };
  const topic = input.topic ?? job.topic ?? "";
  const fileName = input.fileName ?? null;

  // Transition → processing.
  const startedAt = new Date().toISOString();
  await supabaseAdmin
    .from("generations")
    .update({ status: "processing", started_at: startedAt, progress: 10 })
    .eq("id", jobId);
  await supabaseAdmin.from("generation_events").insert({
    generation_id: jobId,
    user_id: job.user_id,
    event: "started",
    detail: {} as Json,
  });

  // Cooperative-cancel poller.
  const abort = new AbortController();
  let cancelled = false;
  const poll = setInterval(async () => {
    const { data: check } = await supabaseAdmin
      .from("generations")
      .select("cancel_requested")
      .eq("id", jobId)
      .maybeSingle();
    if (check?.cancel_requested) {
      cancelled = true;
      abort.abort();
    }
  }, 1000);

  try {
    // Enforce quota just before the paid call.
    try {
      await consumeCredit(job.user_id, 1);
    } catch (quotaErr) {
      clearInterval(poll);
      const msg = quotaErr instanceof Error ? quotaErr.message : "Quota exceeded";
      await finalize(jobId, job.user_id, "failed", {
        error: msg,
        error_code: "quota_exceeded",
        detail: { reason: "quota_exceeded" },
      });
      return;
    }

    // --- Brand Brain: orchestrate the final system prompt. ---
    const { orchestratePrompt, evaluateQuality } = await import("./brand.server");
    const { GENERATE_SYSTEM_PROMPT } = await import("./generate.functions");
    let systemPrompt: string | undefined;
    let brandId: string | null = null;
    try {
      const orchestrated = await orchestratePrompt({
        userId: job.user_id,
        basePrompt: GENERATE_SYSTEM_PROMPT,
        topic,
        projectId: job.project_id,
      });
      systemPrompt = orchestrated.systemPrompt;
      brandId = orchestrated.brandId;
      if (brandId) {
        await supabaseAdmin.from("generation_events").insert({
          generation_id: jobId,
          user_id: job.user_id,
          event: "brand_context",
          detail: {
            brand_id: brandId,
            knowledge_chunks: orchestrated.usedKnowledge,
            learning_signals: orchestrated.usedSignals,
          } as Json,
        });
      }
    } catch (brandErr) {
      console.error("Brand orchestration failed (non-fatal):", brandErr);
    }

    const assets = await callGenerateModel({ topic, fileName, signal: abort.signal, systemPrompt });

    if (cancelled) {
      clearInterval(poll);
      await finalize(jobId, job.user_id, "cancelled", { detail: {} as Json });
      return;
    }

    await supabaseAdmin
      .from("generations")
      .update({ progress: 60, output: assets as unknown as Json, credits_used: 1 })
      .eq("id", jobId);
    await supabaseAdmin.from("generation_events").insert({
      generation_id: jobId,
      user_id: job.user_id,
      event: "progress",
      detail: { progress: 60 } as Json,
    });

    // Fan out to library.
    const rows = buildLibraryRows({
      userId: job.user_id,
      projectId: job.project_id,
      generationId: jobId,
      topic,
      assets,
    });
    if (rows.length) {
      const { error: libErr } = await supabaseAdmin.from("library_assets").insert(rows);
      if (libErr) console.error("Library fan-out failed:", libErr);
    }

    // Prefs (best-effort).
    await supabaseAdmin.from("user_preferences").upsert(
      {
        user_id: job.user_id,
        preferences: {
          last_project_id: job.project_id,
          last_topic: topic,
          last_generated_at: new Date().toISOString(),
        } as Json,
      },
      { onConflict: "user_id" },
    );

    clearInterval(poll);
    await finalize(jobId, job.user_id, "complete", { detail: { items: rows.length } as Json });

    // --- AI Quality Loop (non-blocking, non-fatal). ---
    void evaluateQuality({
      userId: job.user_id,
      generationId: jobId,
      brandId,
      samples: rows.slice(0, 12).map((r) => r.content),
    }).catch((e) => console.error("Quality loop failed:", e));
  } catch (err) {
    clearInterval(poll);
    if (cancelled || (err instanceof Error && err.name === "AbortError")) {
      await finalize(jobId, job.user_id, "cancelled", { detail: {} as Json });
      return;
    }
    const msg = err instanceof Error ? err.message : "Generation failed";
    const code = (err as { code?: string } | null)?.code ?? "generation_failed";
    await finalize(jobId, job.user_id, "failed", {
      error: msg,
      error_code: code,
      detail: { error: msg, code } as Json,
    });
  }
}

async function finalize(
  jobId: string,
  userId: string,
  status: JobStatus,
  opts: { error?: string; error_code?: string; detail: Json },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const patch: {
    status: JobStatus;
    finished_at: string;
    progress?: number;
    cancelled_at?: string;
    error?: string;
    error_code?: string;
  } = { status, finished_at: now };
  if (status === "complete") patch.progress = 100;
  if (status === "cancelled") patch.cancelled_at = now;
  if (opts.error) patch.error = opts.error;
  if (opts.error_code) patch.error_code = opts.error_code;
  await supabaseAdmin.from("generations").update(patch).eq("id", jobId);
  await supabaseAdmin.from("generation_events").insert({
    generation_id: jobId,
    user_id: userId,
    event:
      status === "complete" ? "completed" : status === "failed" ? "failed" : "cancelled",
    detail: opts.detail,
  });
}

// ---------- List / get / cancel / retry ----------

const IdInput = z.object({ id: z.string().uuid() });

const ListJobsInput = z.object({
  projectId: z.string().uuid().nullish(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export const listRecentJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListJobsInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("generations")
      .select(
        "id,kind,topic,model,project_id,parent_id,created_at,updated_at,status,progress,version,error,started_at,finished_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getJob = createServerFn({ method: "POST" })
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

export const cancelJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: loadErr } = await supabase
      .from("generations")
      .select("id,status")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (loadErr || !row) throw new Error(loadErr?.message ?? "Not found");
    if (row.status === "complete" || row.status === "failed" || row.status === "cancelled") {
      return { ok: true, status: row.status };
    }
    // Flag for cooperative cancel; if still queued, transition immediately.
    const nowIso = new Date().toISOString();
    const patch: {
      cancel_requested: boolean;
      status?: JobStatus;
      cancelled_at?: string;
      finished_at?: string;
    } = { cancel_requested: true };
    if (row.status === "queued") {
      patch.status = "cancelled";
      patch.cancelled_at = nowIso;
      patch.finished_at = nowIso;
    }
    const { error: updErr } = await supabase.from("generations").update(patch).eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    await supabase.from("generation_events").insert({
      generation_id: data.id,
      user_id: userId,
      event: row.status === "queued" ? "cancelled" : "cancel_requested",
      detail: {} as Json,
    });
    return { ok: true };
  });

export const retryJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: src, error: loadErr } = await supabase
      .from("generations")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (loadErr || !src) throw new Error(loadErr?.message ?? "Not found");
    if (src.status === "queued" || src.status === "processing") {
      throw new Error("Job is still active; cancel it before retrying.");
    }

    const now = new Date().toISOString();
    const { data: gen, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        project_id: src.project_id,
        kind: src.kind,
        topic: src.topic,
        input: src.input as Json,
        output: {} as Json,
        model: src.model,
        status: "queued",
        credits_used: 0,
        parent_id: src.id,
        progress: 0,
        queued_at: now,
        version: (src.version ?? 1) + 1,
        attempt: (src.attempt ?? 1) + 1,
      })
      .select("id")
      .single();
    if (error || !gen) throw new Error(error?.message ?? "Failed to retry");

    await supabase.from("generation_events").insert([
      { generation_id: gen.id, user_id: userId, event: "queued", detail: { retried_from: src.id } as Json },
      { generation_id: src.id, user_id: userId, event: "retried", detail: { new_id: gen.id } as Json },
    ]);

    void runGenerationJob(gen.id).catch((e) => {
      console.error("runGenerationJob (retry) crashed:", gen.id, e);
    });

    return { generationId: gen.id };
  });

// ---------- Version lineage ----------

export const getJobLineage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Walk up to root, then fetch all descendants.
    let rootId = data.id;
    for (let i = 0; i < 10; i++) {
      const { data: row } = await supabase
        .from("generations")
        .select("id,parent_id")
        .eq("id", rootId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!row?.parent_id) break;
      rootId = row.parent_id as string;
    }
    // Fetch chain by walking down; simple approach uses recursive query,
    // but we just fetch by user + created_at range and filter client-side.
    const { data: rows } = await supabase
      .from("generations")
      .select("id,parent_id,version,status,created_at,topic")
      .eq("user_id", userId)
      .order("version", { ascending: true });
    const chain: Array<NonNullable<typeof rows>[number]> = [];
    if (!rows) return chain;
    const byId = new Map(rows.map((r) => [r.id, r]));
    const includeRoots = new Set<string>([rootId]);
    for (const r of rows) {
      let cur = r as (typeof rows)[number] | undefined;
      while (cur) {
        if (includeRoots.has(cur.id)) {
          chain.push(r);
          break;
        }
        if (!cur.parent_id) break;
        cur = byId.get(cur.parent_id) as (typeof rows)[number] | undefined;
      }
    }
    return chain;
  });

// ---------- Drafts autosave ----------

const DraftSchema = z.object({
  topic: z.string().max(4000).optional(),
  fileName: z.string().max(300).nullish(),
  updatedAt: z.string().optional(),
});
const SaveDraftInput = z.object({
  projectId: z.string().uuid().nullable(),
  draft: DraftSchema,
});

export const saveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveDraftInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = data.projectId ?? "__none__";
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("drafts")
      .eq("user_id", userId)
      .maybeSingle();
    const drafts = (existing?.drafts ?? {}) as Record<string, unknown>;
    drafts[key] = { ...data.draft, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from("user_preferences").upsert(
      { user_id: userId, drafts: drafts as Json },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_preferences")
      .select("drafts")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.drafts ?? {}) as Record<string, { topic?: string; fileName?: string | null; updatedAt?: string }>;
  });

// Re-export for convenience.
export type { GeneratedAssets };