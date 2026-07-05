import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// --------------- Schemas ---------------

export const WORKFLOW_STAGES = [
  "idea",
  "research",
  "script",
  "recording",
  "editing",
  "ai_generation",
  "review",
  "approval",
  "scheduled",
  "published",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

const StageStr = z.string().trim().min(1).max(60);
const Priority = z.enum(["low", "medium", "high", "urgent"]);
const Status = z.enum([
  "active",
  "blocked",
  "in_progress",
  "review",
  "done",
  "cancelled",
]);
const Platform = z.enum([
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "multi",
  "other",
]);

const Attachment = z.object({
  id: z.string().min(1),
  kind: z.enum(["asset", "generation", "url", "file"]).default("url"),
  label: z.string().max(200).nullish(),
  url: z.string().max(2000).nullish(),
  ref_id: z.string().uuid().nullish(),
});

const CardPayload = z.object({
  workflow_id: z.string().uuid(),
  stage: StageStr.default("idea"),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).nullish(),
  notes: z.string().max(8000).nullish(),
  project_id: z.string().uuid().nullish(),
  linked_generation_id: z.string().uuid().nullish(),
  linked_asset_id: z.string().uuid().nullish(),
  priority: Priority.default("medium"),
  status: Status.default("active"),
  platform: Platform.default("multi"),
  due_date: z.string().nullish(),
  progress: z.number().int().min(0).max(100).default(0),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  attachments: z.array(Attachment).max(50).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const CardPatch = CardPayload.partial().extend({
  archived: z.boolean().optional(),
});

const IdInput = z.object({ id: z.string().uuid() });

// --------------- Workflow (board) helpers ---------------

/**
 * Return the user's default workflow board, creating it on demand.
 * Every user gets exactly one "Main" workflow to start; additional boards
 * can be added later through createWorkflow.
 */
export const ensureDefaultWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: readErr } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (existing) return existing;

    const { data: created, error: insErr } = await supabase
      .from("workflows")
      .insert({
        user_id: userId,
        name: "Main workflow",
        description: "Move every idea from concept to publish.",
        stages: WORKFLOW_STAGES as unknown as string[],
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return created;
  });

export const listWorkflows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// --------------- Card CRUD ---------------

const ListInput = z.object({
  workflow_id: z.string().uuid(),
  search: z.string().trim().max(120).default(""),
  stage: z.union([z.literal("any"), StageStr]).default("any"),
  status: z.union([z.literal("any"), Status]).default("any"),
  priority: z.union([z.literal("any"), Priority]).default("any"),
  platform: z.union([z.literal("any"), Platform]).default("any"),
  project_id: z.union([z.literal("any"), z.string().uuid()]).default("any"),
  assigned_user_id: z
    .union([z.literal("any"), z.string().uuid()])
    .default("any"),
  tag: z.string().trim().max(40).default(""),
  archived: z.enum(["active", "archived", "all"]).default("active"),
  due_before: z.string().nullish(),
  due_after: z.string().nullish(),
  limit: z.number().int().min(1).max(500).default(500),
});

export const listCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("workflow_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("workflow_id", data.workflow_id);

    if (data.archived === "active") q = q.eq("archived", false);
    else if (data.archived === "archived") q = q.eq("archived", true);

    if (data.stage !== "any") q = q.eq("stage", data.stage);
    if (data.status !== "any") q = q.eq("status", data.status);
    if (data.priority !== "any") q = q.eq("priority", data.priority);
    if (data.platform !== "any") q = q.eq("platform", data.platform);
    if (data.project_id !== "any") q = q.eq("project_id", data.project_id);
    if (data.assigned_user_id !== "any")
      q = q.eq("assigned_user_id", data.assigned_user_id);
    if (data.tag) q = q.contains("tags", [data.tag]);
    if (data.due_before) q = q.lte("due_date", data.due_before);
    if (data.due_after) q = q.gte("due_date", data.due_after);

    const s = data.search.trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, "\\$&")}%`;
      q = q.or(
        [
          `title.ilike.${like}`,
          `description.ilike.${like}`,
          `notes.ilike.${like}`,
        ].join(","),
      );
    }

    q = q
      .order("stage", { ascending: true })
      .order("position", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(data.limit);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CardPayload.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Position at the top of the target stage.
    const { data: top } = await supabase
      .from("workflow_cards")
      .select("position")
      .eq("user_id", userId)
      .eq("workflow_id", data.workflow_id)
      .eq("stage", data.stage)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    const newPosition = (top?.position ?? 0) - 1;

    const { data: row, error } = await supabase
      .from("workflow_cards")
      .insert({
        ...data,
        user_id: userId,
        position: newPosition,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("workflow_events").insert({
      user_id: userId,
      workflow_id: data.workflow_id,
      card_id: row.id,
      event: "created",
      detail: { stage: row.stage, title: row.title },
    });
    return row;
  });

export const updateCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: CardPatch }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: before, error: readErr } = await supabase
      .from("workflow_cards")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (readErr || !before) throw new Error(readErr?.message ?? "Not found");

    const { data: row, error } = await supabase
      .from("workflow_cards")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Emit audit events for interesting transitions.
    const events: {
      user_id: string;
      workflow_id: string;
      card_id: string;
      event: string;
      detail: Record<string, unknown>;
    }[] = [];
    if (data.patch.stage && data.patch.stage !== before.stage) {
      events.push({
        user_id: userId,
        workflow_id: row.workflow_id,
        card_id: row.id,
        event: "stage_changed",
        detail: { from: before.stage, to: row.stage },
      });
    }
    if (data.patch.status && data.patch.status !== before.status) {
      events.push({
        user_id: userId,
        workflow_id: row.workflow_id,
        card_id: row.id,
        event: "status_changed",
        detail: { from: before.status, to: row.status },
      });
    }
    if (
      typeof data.patch.progress === "number" &&
      data.patch.progress !== before.progress
    ) {
      events.push({
        user_id: userId,
        workflow_id: row.workflow_id,
        card_id: row.id,
        event: "progress_changed",
        detail: { from: before.progress, to: row.progress },
      });
    }
    if (events.length) {
      await supabase.from("workflow_events").insert(events);
    }
    return row;
  });

/**
 * Move / reorder a card. Assigns a position between neighbours so we can
 * reorder without renumbering the whole column.
 */
const MoveInput = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  target_stage: StageStr,
  before_id: z.string().uuid().nullish(),
  after_id: z.string().uuid().nullish(),
});

export const moveCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MoveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: before, error: readErr } = await supabase
      .from("workflow_cards")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (readErr || !before) throw new Error(readErr?.message ?? "Not found");

    // Look up neighbour positions in the target stage.
    const neighbourIds = [data.before_id, data.after_id].filter(Boolean) as string[];
    const positions: Record<string, number> = {};
    if (neighbourIds.length) {
      const { data: rows } = await supabase
        .from("workflow_cards")
        .select("id,position")
        .in("id", neighbourIds);
      for (const r of rows ?? []) positions[r.id] = r.position;
    }

    let newPosition: number;
    const beforePos = data.before_id ? positions[data.before_id] : null;
    const afterPos = data.after_id ? positions[data.after_id] : null;
    if (beforePos != null && afterPos != null) {
      newPosition = (beforePos + afterPos) / 2;
    } else if (beforePos != null) {
      newPosition = beforePos + 1;
    } else if (afterPos != null) {
      newPosition = afterPos - 1;
    } else {
      // Empty column — pick a middle value.
      newPosition = 0;
    }

    const { data: row, error } = await supabase
      .from("workflow_cards")
      .update({ stage: data.target_stage, position: newPosition })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (before.stage !== data.target_stage) {
      await supabase.from("workflow_events").insert({
        user_id: userId,
        workflow_id: data.workflow_id,
        card_id: data.id,
        event: "stage_changed",
        detail: { from: before.stage, to: data.target_stage },
      });
    }
    return row;
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("workflow_cards")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCardEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("workflow_events")
      .select("*")
      .eq("user_id", userId)
      .eq("card_id", data.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Small helper exposed for other pages that want to file work into a workflow.
const QuickIdeaInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).nullish(),
  project_id: z.string().uuid().nullish(),
  linked_generation_id: z.string().uuid().nullish(),
  linked_asset_id: z.string().uuid().nullish(),
});

export const quickAddIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QuickIdeaInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: wf, error: wfErr } = await supabase
      .from("workflows")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (wfErr) throw new Error(wfErr.message);

    let workflowId = wf?.id;
    if (!workflowId) {
      const { data: created, error: cErr } = await supabase
        .from("workflows")
        .insert({
          user_id: userId,
          name: "Main workflow",
          stages: WORKFLOW_STAGES as unknown as string[],
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      workflowId = created.id;
    }

    const { data: row, error } = await supabase
      .from("workflow_cards")
      .insert({
        user_id: userId,
        workflow_id: workflowId,
        stage: "idea",
        title: data.title,
        description: data.description ?? null,
        project_id: data.project_id ?? null,
        linked_generation_id: data.linked_generation_id ?? null,
        linked_asset_id: data.linked_asset_id ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("workflow_events").insert({
      user_id: userId,
      workflow_id: workflowId,
      card_id: row.id,
      event: "created",
      detail: { source: "quick_add" },
    });
    return row;
  });