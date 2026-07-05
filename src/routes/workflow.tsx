import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Lightbulb,
  Search as SearchIcon,
  FileText,
  Clapperboard,
  Send,
  Plus,
  Sparkles,
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCw,
  X as XIcon,
  Flag,
  Calendar,
  Tag,
  Video,
  Mic,
  Search,
  Eye,
  ShieldCheck,
  Clock,
  Archive,
  GripVertical,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  createCard,
  deleteCard,
  ensureDefaultWorkflow,
  listCards,
  moveCard,
  updateCard,
  WORKFLOW_STAGES,
  type WorkflowStage,
} from "@/lib/workflows.functions";
import { listMyProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/workflow")({
  beforeLoad: requireAuthBeforeLoad,
  component: WorkflowPage,
  head: () => ({
    meta: [
      { title: "Content Workflow — Creator’s Muse" },
      {
        name: "description",
        content:
          "Move every idea from concept to publish with a real-time pipeline: Idea, Research, Script, Recording, Editing, AI, Review, Approval, Schedule, Publish.",
      },
    ],
  }),
});

// --------- Card type (mirrors DB row we care about) ---------

type CardRow = {
  id: string;
  workflow_id: string;
  stage: string;
  title: string;
  description: string | null;
  notes: string | null;
  position: number;
  project_id: string | null;
  linked_generation_id: string | null;
  linked_asset_id: string | null;
  priority: string;
  status: string;
  platform: string;
  due_date: string | null;
  progress: number;
  tags: string[];
  archived: boolean;
  updated_at: string;
  created_at: string;
};

// --------- Stage metadata (visual language preserved) ---------

const STAGE_META: Record<
  WorkflowStage,
  { label: string; icon: typeof Lightbulb; hint: string; accent: string }
> = {
  idea: { label: "Idea", icon: Lightbulb, hint: "Raw concept / angle", accent: "from-primary/40 to-transparent" },
  research: { label: "Research", icon: Search, hint: "Sources & references", accent: "from-primary/35 to-transparent" },
  script: { label: "Script", icon: FileText, hint: "Hook + beats + CTA", accent: "from-primary/30 to-transparent" },
  recording: { label: "Recording", icon: Mic, hint: "Capture takes", accent: "from-primary/30 to-transparent" },
  editing: { label: "Editing", icon: Video, hint: "Cut & polish", accent: "from-primary/30 to-transparent" },
  ai_generation: { label: "AI", icon: Sparkles, hint: "Generate with Muse", accent: "from-primary/35 to-transparent" },
  review: { label: "Review", icon: Eye, hint: "Self / team review", accent: "from-primary/30 to-transparent" },
  approval: { label: "Approval", icon: ShieldCheck, hint: "Sign-off", accent: "from-primary/30 to-transparent" },
  scheduled: { label: "Scheduled", icon: Clock, hint: "Queued to publish", accent: "from-primary/35 to-transparent" },
  published: { label: "Published", icon: Send, hint: "Live", accent: "from-primary/45 to-transparent" },
};

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["active", "blocked", "in_progress", "review", "done", "cancelled"] as const;
const PLATFORMS = ["multi", "instagram", "tiktok", "youtube", "x", "linkedin", "other"] as const;
const PRIORITY_TONE: Record<string, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-foreground/80 border-border",
  high: "text-amber-300 border-amber-500/40",
  urgent: "text-red-300 border-red-500/50",
};

function WorkflowPage() {
  const qc = useQueryClient();
  const ensureWorkflow = useServerFn(ensureDefaultWorkflow);
  const listCardsFn = useServerFn(listCards);
  const createCardFn = useServerFn(createCard);
  const updateCardFn = useServerFn(updateCard);
  const moveCardFn = useServerFn(moveCard);
  const deleteCardFn = useServerFn(deleteCard);
  const listProjectsFn = useServerFn(listMyProjects);

  // ---- Workflow board (auto-provisioned) ----
  const wfQ = useQuery({
    queryKey: ["workflow", "default"],
    queryFn: () => ensureWorkflow(),
    staleTime: 60_000,
  });
  const workflowId = wfQ.data?.id ?? "";

  // ---- Filters ----
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>("any");
  const [status, setStatus] = useState<string>("any");
  const [platform, setPlatform] = useState<string>("any");
  const [projectFilter, setProjectFilter] = useState<string>("any");
  const [tagFilter, setTagFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // ---- Cards ----
  const cardsQ = useQuery({
    queryKey: [
      "workflow-cards",
      workflowId,
      { search, priority, status, platform, projectFilter, tagFilter, showArchived },
    ],
    enabled: !!workflowId,
    queryFn: () =>
      listCardsFn({
        data: {
          workflow_id: workflowId,
          search,
          priority,
          status,
          platform,
          project_id: projectFilter,
          tag: tagFilter,
          archived: showArchived ? "archived" : "active",
        },
      }),
    staleTime: 5_000,
  });

  // ---- Projects (for linking + filtering) ----
  const projectsQ = useQuery({
    queryKey: ["projects", "for-workflow"],
    queryFn: () =>
      listProjectsFn({
        data: { archived: "active", limit: 100 },
      }),
    staleTime: 60_000,
  });
  const projectById = useMemo(() => {
    const m = new Map<string, { name: string }>();
    for (const p of projectsQ.data?.rows ?? []) m.set(p.id, { name: p.name });
    return m;
  }, [projectsQ.data]);

  // ---- Realtime sync ----
  useEffect(() => {
    if (!workflowId) return;
    let uid: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
      if (!uid) return;
      channel = supabase
        .channel(`workflow-cards-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workflow_cards",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["workflow-cards"] });
          },
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [workflowId, qc]);

  // ---- Group cards by stage (sorted by position) ----
  const byStage = useMemo(() => {
    const map: Record<string, CardRow[]> = {};
    for (const s of WORKFLOW_STAGES) map[s] = [];
    for (const c of (cardsQ.data ?? []) as CardRow[]) {
      if (!map[c.stage]) map[c.stage] = [];
      map[c.stage].push(c);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [cardsQ.data]);

  // ---- Mutations ----

  const invalidateCards = () =>
    qc.invalidateQueries({ queryKey: ["workflow-cards"] });

  const createMut = useMutation({
    mutationFn: (payload: { title: string; stage: WorkflowStage }) =>
      createCardFn({
        data: {
          workflow_id: workflowId,
          title: payload.title,
          stage: payload.stage,
        },
      }),
    onSuccess: () => invalidateCards(),
    onError: (e: Error) => toast.error(e.message || "Could not create card"),
  });

  const updateMut = useMutation({
    mutationFn: (payload: { id: string; patch: Partial<CardRow> }) =>
      updateCardFn({ data: { id: payload.id, patch: payload.patch } }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["workflow-cards"] });
      const prev = qc.getQueriesData<CardRow[]>({ queryKey: ["workflow-cards"] });
      qc.setQueriesData<CardRow[]>({ queryKey: ["workflow-cards"] }, (old) =>
        (old ?? []).map((c) => (c.id === payload.id ? { ...c, ...payload.patch } : c)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) for (const [k, v] of ctx.prev) qc.setQueryData(k, v);
      toast.error(e.message || "Update failed");
    },
    onSettled: () => invalidateCards(),
  });

  const moveMut = useMutation({
    mutationFn: (payload: {
      id: string;
      target_stage: WorkflowStage;
      before_id: string | null;
      after_id: string | null;
    }) =>
      moveCardFn({
        data: {
          id: payload.id,
          workflow_id: workflowId,
          target_stage: payload.target_stage,
          before_id: payload.before_id,
          after_id: payload.after_id,
        },
      }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["workflow-cards"] });
      const prev = qc.getQueriesData<CardRow[]>({ queryKey: ["workflow-cards"] });
      qc.setQueriesData<CardRow[]>({ queryKey: ["workflow-cards"] }, (old) =>
        (old ?? []).map((c) =>
          c.id === payload.id ? { ...c, stage: payload.target_stage } : c,
        ),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) for (const [k, v] of ctx.prev) qc.setQueryData(k, v);
      toast.error(e.message || "Move failed");
    },
    onSettled: () => invalidateCards(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCardFn({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["workflow-cards"] });
      const prev = qc.getQueriesData<CardRow[]>({ queryKey: ["workflow-cards"] });
      qc.setQueriesData<CardRow[]>({ queryKey: ["workflow-cards"] }, (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) for (const [k, v] of ctx.prev) qc.setQueryData(k, v);
      toast.error(e.message || "Delete failed");
    },
    onSettled: () => invalidateCards(),
  });

  // ---- New-card composer ----
  const [drafting, setDrafting] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const addIdea = () => {
    const t = draftTitle.trim();
    if (!t || !workflowId) return;
    createMut.mutate({ title: t, stage: "idea" });
    setDraftTitle("");
    setDrafting(false);
  };

  // ---- Drag/drop state ----
  const draggingIdRef = useRef<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const onDropOnStage = (stage: WorkflowStage) => {
    const id = draggingIdRef.current;
    draggingIdRef.current = null;
    setDragOverStage(null);
    if (!id) return;
    const targetList = byStage[stage] ?? [];
    const after = targetList[targetList.length - 1];
    moveMut.mutate({
      id,
      target_stage: stage,
      before_id: after ? after.id : null,
      after_id: null,
    });
  };

  const onDropOnCard = (
    stage: WorkflowStage,
    targetCard: CardRow,
    place: "before" | "after",
  ) => {
    const id = draggingIdRef.current;
    draggingIdRef.current = null;
    setDragOverStage(null);
    if (!id || id === targetCard.id) return;
    const list = byStage[stage] ?? [];
    const idx = list.findIndex((c) => c.id === targetCard.id);
    const neighbourIdx = place === "before" ? idx - 1 : idx + 1;
    const neighbour = list[neighbourIdx];
    moveMut.mutate({
      id,
      target_stage: stage,
      before_id: place === "before" ? neighbour?.id ?? null : targetCard.id,
      after_id: place === "before" ? targetCard.id : neighbour?.id ?? null,
    });
  };

  // ---- Card detail dialog ----
  const [openCard, setOpenCard] = useState<CardRow | null>(null);

  // ---- Render ----
  const loading = wfQ.isLoading || cardsQ.isLoading;
  const errored = wfQ.isError || cardsQ.isError;

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-8">
        <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
          Workflow / Creator OS
        </h1>
        <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 font-mono text-[10px] uppercase tracking-widest">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Pipeline Live
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] animate-fade-up space-y-6 p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">
              Idea → Script → Reel → <span className="text-primary">Publish</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Every piece moves through the pipeline. Real-time sync, autosaved, versioned.
            </p>
          </div>
          {!drafting ? (
            <button
              onClick={() => setDrafting(true)}
              disabled={!workflowId}
              className="flex h-10 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              <Plus className="size-4" /> New idea
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addIdea();
                  if (e.key === "Escape") {
                    setDrafting(false);
                    setDraftTitle("");
                  }
                }}
                placeholder="Title your idea…"
                className="h-10 w-72 rounded-lg border border-border bg-card/40 px-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={addIdea}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                disabled={createMut.isPending}
              >
                {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
              </button>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/30 p-3">
          <label className="relative flex items-center">
            <SearchIcon className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description, notes"
              className="h-9 w-72 rounded-md border border-border bg-background/40 pl-7 pr-2 text-xs focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <FilterSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={["any", ...PRIORITIES]}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={["any", ...STATUSES]}
          />
          <FilterSelect
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={["any", ...PLATFORMS]}
          />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background/40 px-2 text-xs focus:border-primary/40 focus:outline-none"
          >
            <option value="any">Any project</option>
            {(projectsQ.data?.rows ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="relative flex items-center">
            <Tag className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
            <input
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Tag"
              className="h-9 w-32 rounded-md border border-border bg-background/40 pl-7 pr-2 text-xs focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-md border px-3 text-[11px] font-mono uppercase tracking-wider",
              showArchived
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Archive className="size-3.5" /> {showArchived ? "Archived" : "Active"}
          </button>
          {(search ||
            priority !== "any" ||
            status !== "any" ||
            platform !== "any" ||
            projectFilter !== "any" ||
            tagFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setPriority("any");
                setStatus("any");
                setPlatform("any");
                setProjectFilter("any");
                setTagFilter("");
              }}
              className="flex h-9 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" /> Clear
            </button>
          )}
          <div className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {cardsQ.data?.length ?? 0} cards
          </div>
        </div>

        {errored && (
          <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4" /> Failed to load workflow.
            </span>
            <button
              onClick={() => {
                wfQ.refetch();
                cardsQ.refetch();
              }}
              className="flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 hover:bg-destructive/20"
            >
              <RotateCw className="size-3" /> Retry
            </button>
          </div>
        )}

        {/* Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {WORKFLOW_STAGES.map((stageKey) => {
            const meta = STAGE_META[stageKey];
            const items = byStage[stageKey] ?? [];
            const Icon = meta.icon;
            const active = dragOverStage === stageKey;
            return (
              <div
                key={stageKey}
                onDragOver={(e) => {
                  if (draggingIdRef.current) {
                    e.preventDefault();
                    setDragOverStage(stageKey);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverStage === stageKey) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropOnStage(stageKey);
                }}
                className={cn(
                  "flex min-h-[520px] w-[300px] shrink-0 flex-col rounded-2xl border bg-card/30 p-4 transition-colors",
                  active
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-primary/30",
                )}
              >
                <div
                  className={cn(
                    "mb-3 flex items-center justify-between rounded-lg bg-gradient-to-r p-3",
                    meta.accent,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-background/60 ring-1 ring-primary/30">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider">
                        {meta.label}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        {meta.hint}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {items.length.toString().padStart(2, "0")}
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {loading && items.length === 0 && (
                    <>
                      <div className="h-16 animate-pulse rounded-lg border border-border/40 bg-background/40" />
                      <div className="h-16 animate-pulse rounded-lg border border-border/40 bg-background/40" />
                    </>
                  )}
                  {!loading && items.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground">
                      Drop cards here
                    </div>
                  )}
                  {items.map((c) => (
                    <CardRowView
                      key={c.id}
                      card={c}
                      stage={stageKey}
                      projectName={c.project_id ? projectById.get(c.project_id)?.name : null}
                      onDragStart={() => (draggingIdRef.current = c.id)}
                      onDragEnd={() => {
                        draggingIdRef.current = null;
                        setDragOverStage(null);
                      }}
                      onDropBefore={() => onDropOnCard(stageKey, c, "before")}
                      onDropAfter={() => onDropOnCard(stageKey, c, "after")}
                      onOpen={() => setOpenCard(c)}
                      onDelete={() =>
                        deleteMut.mutate(c.id)
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {openCard && (
        <CardDetailModal
          card={openCard}
          projects={projectsQ.data?.rows ?? []}
          onClose={() => setOpenCard(null)}
          onPatch={(patch) => {
            updateMut.mutate({ id: openCard.id, patch });
            setOpenCard({ ...openCard, ...patch } as CardRow);
          }}
        />
      )}
    </AppShell>
  );
}

// ---------- Card row ----------

function CardRowView({
  card,
  stage,
  projectName,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onDropAfter,
  onOpen,
  onDelete,
}: {
  card: CardRow;
  stage: WorkflowStage;
  projectName: string | null | undefined;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropBefore: () => void;
  onDropAfter: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className="group rounded-lg border border-border bg-background/50 p-3 transition-colors hover:border-primary/30 hover:bg-background/80"
    >
      {/* drop zone (before) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDropBefore();
        }}
        className="-mt-1 mb-1 h-1"
      />
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 cursor-grab text-muted-foreground/60" />
        <button
          onClick={onOpen}
          className="flex-1 text-left"
        >
          <p className="text-xs font-medium leading-snug">{card.title}</p>
          {card.description && (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
              {card.description}
            </p>
          )}
        </button>
      </div>

      {/* meta chips */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {card.priority !== "medium" && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest",
              PRIORITY_TONE[card.priority],
            )}
          >
            <Flag className="size-2.5" /> {card.priority}
          </span>
        )}
        {card.status !== "active" && (
          <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {card.status.replace("_", " ")}
          </span>
        )}
        {card.platform !== "multi" && (
          <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {card.platform}
          </span>
        )}
        {card.due_date && (
          <span className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            <Calendar className="size-2.5" /> {card.due_date.slice(0, 10)}
          </span>
        )}
        {projectName && (
          <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
            {projectName}
          </span>
        )}
        {card.tags?.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground"
          >
            #{t}
          </span>
        ))}
      </div>

      {/* progress + actions */}
      {card.progress > 0 && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${card.progress}%` }}
          />
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <AssistLink stage={stage} title={card.title} />
        <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          <button
            onClick={onDelete}
            className="rounded-md p-0.5 text-muted-foreground/60 hover:text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      {/* drop zone (after) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDropAfter();
        }}
        className="-mb-1 mt-1 h-1"
      />
    </div>
  );
}

// ---------- Filter select ----------

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-border bg-background/40 px-2 text-xs focus:border-primary/40 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "any" ? `Any ${label.toLowerCase()}` : o.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}

// ---------- Card detail modal (autosave) ----------

function CardDetailModal({
  card,
  projects,
  onClose,
  onPatch,
}: {
  card: CardRow;
  projects: { id: string; name: string }[];
  onClose: () => void;
  onPatch: (patch: Partial<CardRow>) => void;
}) {
  // Local buffered state; autosave debounces changes to onPatch.
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [tagsInput, setTagsInput] = useState((card.tags ?? []).join(", "));
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const patch: Partial<CardRow> = {};
      if (title !== card.title) patch.title = title;
      if ((description || null) !== (card.description || null))
        patch.description = description || null;
      if ((notes || null) !== (card.notes || null)) patch.notes = notes || null;
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const same =
        tags.length === (card.tags ?? []).length &&
        tags.every((t, i) => t === card.tags[i]);
      if (!same) patch.tags = tags;
      if (Object.keys(patch).length) onPatch(patch);
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, notes, tagsInput]);

  // Field commit helpers for selects/date (no debounce needed)
  const setField = <K extends keyof CardRow>(k: K, v: CardRow[K]) => {
    onPatch({ [k]: v } as unknown as Partial<CardRow>);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-background/70 p-8 backdrop-blur"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-8 w-full max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-xl font-bold tracking-tight focus:outline-none"
            />
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Autosaved · v{Math.max(1, Math.floor(new Date(card.updated_at).getTime() / 60000) % 999)} · Updated {new Date(card.updated_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage">
            <select
              value={card.stage}
              onChange={(e) => setField("stage", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background/40 px-2 text-xs"
            >
              {WORKFLOW_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={card.status}
              onChange={(e) => setField("status", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background/40 px-2 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={card.priority}
              onChange={(e) => setField("priority", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background/40 px-2 text-xs"
            >
              {PRIORITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Platform">
            <select
              value={card.platform}
              onChange={(e) => setField("platform", e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background/40 px-2 text-xs"
            >
              {PLATFORMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select
              value={card.project_id ?? ""}
              onChange={(e) => setField("project_id", (e.target.value || null) as never)}
              className="h-9 w-full rounded-md border border-border bg-background/40 px-2 text-xs"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={card.due_date ? card.due_date.slice(0, 10) : ""}
              onChange={(e) =>
                setField(
                  "due_date",
                  (e.target.value ? new Date(e.target.value).toISOString() : null) as never,
                )
              }
              className="h-9 w-full rounded-md border border-border bg-background/40 px-2 text-xs"
            />
          </Field>
          <Field label="Progress">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={card.progress}
                onChange={(e) => setField("progress", Number(e.target.value) as never)}
                className="flex-1"
              />
              <span className="w-10 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                {card.progress}%
              </span>
            </div>
          </Field>
          <Field label="Archived">
            <button
              onClick={() => setField("archived", (!card.archived) as never)}
              className={cn(
                "h-9 w-full rounded-md border px-2 text-xs",
                card.archived
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {card.archived ? "Archived" : "Active"}
            </button>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-border bg-background/40 p-2 text-xs"
          />
        </Field>
        <Field label="Notes">
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-border bg-background/40 p-2 text-xs"
          />
        </Field>
        <Field label="Tags (comma separated)">
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background/40 px-2 text-xs"
          />
        </Field>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {card.linked_generation_id && <span>· Linked generation</span>}
            {card.linked_asset_id && <span>· Linked asset</span>}
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20"
          >
            <Sparkles className="size-3" /> AI assist
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function AssistLink({ stage, title }: { stage: WorkflowStage; title: string }) {
  const to =
    stage === "recording" || stage === "editing"
      ? "/reels"
      : "/dashboard";
  return (
    <Link
      to={to}
      className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-primary/80 hover:text-primary"
      title={`AI assist: ${title}`}
    >
      <Sparkles className="size-2.5" /> AI assist
    </Link>
  );
}

// Keep Clapperboard import used (referenced by /reels page navigation only in tree).
void Clapperboard;