import { createFileRoute } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  Upload,
  Sparkles,
  Loader2,
  Film,
  Zap,
  X,
  AlertTriangle,
  RotateCcw,
  History,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type GeneratedAssets } from "@/lib/generate.functions";
import {
  enqueueGeneration,
  listRecentJobs,
  getJob,
  cancelJob,
  retryJob,
  saveDraft,
  getDrafts,
} from "@/lib/jobs.functions";
import { deleteGeneration, getWorkbenchPrefs } from "@/lib/workbench.functions";
import { listMyProjects } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AuthScreen } from "@/components/auth-screen";
import { AppShell } from "@/components/app-shell";
import { usePlan, refreshPlan } from "@/lib/plan";
import { UpgradeModal } from "@/components/upgrade-modal";

const ResultsGrid = lazy(() => import("@/components/dashboard-results"));

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuthBeforeLoad,
  pendingComponent: () => <AuthScreen message="Opening your workbench…" />,
  pendingMs: 0,
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Workbench — Creator’s Muse" },
      { name: "description", content: "Your AI creator workbench: synthesize hooks, captions, threads, and shorts ideas." },
    ],
  }),
});

function DashboardPage() {
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<GeneratedAssets | null>(null);
  const [currentGenId, setCurrentGenId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const enqueueFn = useServerFn(enqueueGeneration);
  const listJobsFn = useServerFn(listRecentJobs);
  const getJobFn = useServerFn(getJob);
  const cancelFn = useServerFn(cancelJob);
  const retryFn = useServerFn(retryJob);
  const saveDraftFn = useServerFn(saveDraft);
  const getDraftsFn = useServerFn(getDrafts);
  const deleteGenFn = useServerFn(deleteGeneration);
  const listProjectsFn = useServerFn(listMyProjects);
  const prefsFn = useServerFn(getWorkbenchPrefs);
  const qc = useQueryClient();
  const { plan, remaining } = usePlan();

  // Load initial preferences (last project) + hydrate autosaved draft for that project.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prefs, drafts] = await Promise.all([prefsFn(), getDraftsFn()]);
        if (cancelled) return;
        const pid = prefs.lastProjectId ?? null;
        if (pid) setProjectId(pid);
        const key = pid ?? "__none__";
        const d = drafts[key];
        if (d?.topic) setTopic(d.topic);
        else if (prefs.lastTopic) setTopic(prefs.lastTopic);
      } catch {
        /* best-effort */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectsQ = useQuery({
    queryKey: ["projects", "for-picker"],
    queryFn: () => listProjectsFn({ data: { archived: "active", limit: 100, offset: 0 } }),
  });

  const historyQ = useQuery({
    queryKey: ["jobs", "recent", projectId],
    queryFn: () => listJobsFn({ data: { projectId: projectId ?? undefined, limit: 12, offset: 0 } }),
    refetchOnWindowFocus: true,
  });

  const deleteGenMut = useMutation({
    mutationFn: (id: string) => deleteGenFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Generation removed");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cancel requested");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Cancel failed"),
  });

  const retryMut = useMutation({
    mutationFn: (id: string) => retryFn({ data: { id } }),
    onSuccess: (r) => {
      setActiveJobId(r.generationId);
      setActiveProgress(0);
      setResults(null);
      setError(null);
      toast.success("Retrying generation");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Retry failed"),
  });

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const trimmedTopic = useMemo(() => topic.trim(), [topic]);
  const canGenerate = !!trimmedTopic || !!file;
  const loading = !!activeJobId;

  // ------- Autosave draft (debounced) -------
  const draftDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draftDebounce.current) clearTimeout(draftDebounce.current);
    draftDebounce.current = setTimeout(() => {
      saveDraftFn({
        data: {
          projectId,
          draft: { topic, fileName: file?.name ?? null },
        },
      }).catch(() => {});
    }, 600);
    return () => {
      if (draftDebounce.current) clearTimeout(draftDebounce.current);
    };
  }, [topic, file, projectId, saveDraftFn]);

  // ------- Realtime subscription to job updates -------
  useEffect(() => {
    let uid: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
      if (!uid) return;
      channel = supabase
        .channel(`gen-jobs-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "generations", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = (payload.new ?? payload.old) as {
              id: string;
              status?: string;
              progress?: number;
              error?: string | null;
              output?: unknown;
            } | null;
            if (!row) return;
            // Live progress for the active job.
            setActiveJobId((cur) => {
              if (cur && cur === row.id) {
                if (typeof row.progress === "number") setActiveProgress(row.progress);
                if (row.status === "complete") {
                  const out = row.output as GeneratedAssets | null;
                  if (out?.hooks) setResults(out);
                  setCurrentGenId(row.id);
                  setActiveProgress(100);
                  toast.success("Synthesis complete");
                  refreshPlan();
                  qc.invalidateQueries({ queryKey: ["library"] });
                  return null;
                }
                if (row.status === "failed") {
                  setError(row.error ?? "Generation failed");
                  toast.error(row.error ?? "Generation failed");
                  return null;
                }
                if (row.status === "cancelled") {
                  toast.message("Generation cancelled");
                  return null;
                }
              }
              return cur;
            });
            qc.invalidateQueries({ queryKey: ["jobs"] });
          },
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    if (remaining <= 0) {
      setUpgradeOpen(true);
      return;
    }
    setResults(null);
    setError(null);
    setActiveProgress(0);
    try {
      const r = await enqueueFn({
        data: {
          topic: trimmedTopic || (file ? `Video clip: ${file.name}` : ""),
          fileName: file?.name,
          projectId: projectId ?? null,
        },
      });
      setActiveJobId(r.generationId);
      toast.message("Generation queued");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast.error(msg);
    }
  }, [canGenerate, enqueueFn, trimmedTopic, file, remaining, projectId, qc]);

  const loadFromHistory = useCallback(
    async (id: string) => {
      try {
        const row = await getJobFn({ data: { id } });
        if (!row) return;
        if (row.status === "queued" || row.status === "processing") {
          setActiveJobId(row.id);
          setActiveProgress(row.progress ?? 0);
          if (row.topic) setTopic(row.topic);
          if (row.project_id) setProjectId(row.project_id);
          toast.message("Attached to running job");
          return;
        }
        const out = row.output as unknown as GeneratedAssets | null;
        if (out && out.hooks && out.captions && out.posts && out.shorts) {
          setResults(out);
          setCurrentGenId(row.id);
          if (row.topic) setTopic(row.topic);
          if (row.project_id) setProjectId(row.project_id);
          toast.success("Loaded from history");
        } else {
          toast.error("Generation has no viewable output");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      }
    },
    [getJobFn],
  );

  const cancelActive = useCallback(() => {
    if (activeJobId) cancelMut.mutate(activeJobId);
  }, [activeJobId, cancelMut]);

  return (
    <AppShell>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-8">
          <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
            Workbench / New Production
          </h1>
          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 font-mono text-[10px] font-medium uppercase tracking-widest">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            AI Engine Online
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl animate-fade-up space-y-8 p-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">
              Synthesize, <span className="text-white">in seconds.</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Drop a clip, name your topic, and let the engine generate platform-ready assets.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Input column */}
            <div className="col-span-12 space-y-5 lg:col-span-5">
              <div className="space-y-2">
                <label className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Project
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card/40 px-3">
                  <FolderOpen className="size-4 text-primary" />
                  <select
                    value={projectId ?? ""}
                    onChange={(e) => setProjectId(e.target.value || null)}
                    className="h-11 flex-1 bg-transparent text-sm outline-none"
                  >
                    <option value="">No project (unassigned)</option>
                    {projectsQ.data?.rows.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Input source
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "group relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/40 ring-1 ring-transparent transition-colors",
                    "hover:border-primary/40 hover:ring-primary/20 hover:bg-card/60",
                    dragOver && "border-primary/60 bg-primary/5 ring-primary/30",
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <>
                      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
                        <Film className="size-5 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB · ready
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex size-12 items-center justify-center rounded-full bg-secondary ring-1 ring-border transition-transform group-hover:scale-110">
                        <Upload className="size-5 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Drop video or raw clip</p>
                        <p className="mt-1 text-xs text-muted-foreground">MP4, MOV up to 2GB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Topic & context
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What is this video about? e.g. Productivity hacks for remote engineers, the future of AI in creator tools…"
                  className="min-h-[120px] w-full rounded-xl border border-border bg-card/40 p-4 text-sm placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                onClick={generate}
                disabled={loading || !canGenerate}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground transition-transform",
                  "shadow-glow hover:scale-[1.01] active:scale-[0.99]",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Synthesizing… {activeProgress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Generate Synthesis
                  </>
                )}
              </button>
              {loading && (
                <div className="space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(4, activeProgress)}%` }}
                    />
                  </div>
                  <button
                    onClick={cancelActive}
                    className="mx-auto flex items-center gap-1.5 rounded-md border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                  >
                    <X className="size-3" /> Cancel generation
                  </button>
                </div>
              )}
              {currentGenId && !loading && (
                <p className="text-center font-mono text-[10px] uppercase tracking-widest text-primary/80">
                  ✓ Saved · autosaved to library
                </p>
              )}

              <div className="rounded-xl border border-border bg-card/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                  <Zap className="size-3.5 text-primary" /> Pro tip
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The more specific your topic, the sharper the hooks. Include audience, angle, and an outcome.
                </p>
              </div>
            </div>

            {/* Results column */}
            <div className="col-span-12 lg:col-span-7">
              {!results && !loading && !error && <EmptyState />}
              {loading && <LoadingState />}
              {error && !loading && <ErrorState message={error} onRetry={generate} />}
              {results && (
                <Suspense fallback={<LoadingState />}>
                  <ResultsGrid results={results} />
                </Suspense>
              )}
            </div>
          </div>

          {/* History */}
          <div className="rounded-2xl border border-border bg-card/30 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                <History className="size-3 text-primary" /> Recent generations
              </h3>
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {historyQ.data?.length ?? 0} entries
              </span>
            </div>
            {historyQ.isLoading ? (
              <div className="flex h-24 items-center justify-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : !historyQ.data || historyQ.data.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Your generation history will appear here. Every synthesis is automatically saved.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {historyQ.data.map((h) => (
                  <div
                    key={h.id}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-lg border bg-background/40 px-3 py-2 transition-colors hover:border-primary/40",
                      h.id === currentGenId ? "border-primary/60 bg-primary/5" : "border-border",
                      h.id === activeJobId && "border-primary/60 bg-primary/10",
                    )}
                  >
                    <button
                      onClick={() => loadFromHistory(h.id)}
                      className="flex-1 truncate text-left"
                    >
                      <p className="truncate text-xs font-medium">
                        {h.topic ?? "(untitled)"}
                        {typeof h.version === "number" && h.version > 1 && (
                          <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                            v{h.version}
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        {new Date(h.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        <span className={cn(
                          h.status === "processing" && "text-primary",
                          h.status === "queued" && "text-primary/70",
                          h.status === "failed" && "text-destructive",
                          h.status === "cancelled" && "text-muted-foreground",
                        )}>
                          {h.status}
                        </span>
                      </p>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {(h.status === "queued" || h.status === "processing") && (
                        <button
                          onClick={() => cancelMut.mutate(h.id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                          aria-label="Cancel"
                          title="Cancel"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                      {(h.status === "failed" || h.status === "cancelled") && (
                        <button
                          onClick={() => retryMut.mutate(h.id)}
                          className="rounded p-1 text-muted-foreground hover:text-primary"
                          aria-label="Retry"
                          title="Retry"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteGenMut.mutate(h.id)}
                        aria-label="Delete"
                        title="Delete"
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={`You've used all ${plan.monthlyCredits} generations on the ${plan.name} plan this month.`}
      />
    </AppShell>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/30">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground">Synthesis failed</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
      >
        <RotateCcw className="size-3.5" /> Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-secondary ring-1 ring-border animate-float">
        <Sparkles className="size-6 text-primary" />
      </div>
      <p className="text-sm font-medium">Your synthesized assets will appear here.</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Drop a clip, write a topic, and hit generate. The engine returns 4 categories of platform-ready output.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-5"
        >
          <div className="animate-shimmer absolute inset-0 pointer-events-none" />
          <div className="mb-4 h-3 w-24 rounded bg-secondary" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-secondary" />
            <div className="h-3 w-5/6 rounded bg-secondary" />
            <div className="h-3 w-4/6 rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}