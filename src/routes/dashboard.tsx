import { createFileRoute } from "@tanstack/react-router";
import {
  Suspense,
  lazy,
  useCallback,
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
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { generateAssets, type GeneratedAssets } from "@/lib/generate.functions";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { usePlan, incrementUsage } from "@/lib/plan";
import { UpgradeModal } from "@/components/upgrade-modal";

const ResultsGrid = lazy(() => import("@/components/dashboard-results"));

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Workbench — Nexus" },
      { name: "description", content: "Your AI creator workbench: synthesize hooks, captions, threads, and shorts ideas." },
    ],
  }),
});

function DashboardPage() {
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedAssets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const generateFn = useServerFn(generateAssets);
  const { plan, remaining } = usePlan();

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const trimmedTopic = useMemo(() => topic.trim(), [topic]);
  const canGenerate = !!trimmedTopic || !!file;

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    if (remaining <= 0) {
      setUpgradeOpen(true);
      return;
    }
    setLoading(true);
    setResults(null);
    setError(null);
    try {
      const r = await generateFn({
        data: {
          topic: trimmedTopic || (file ? `Video clip: ${file.name}` : ""),
          fileName: file?.name,
        },
      });
      setResults(r);
      incrementUsage(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [canGenerate, generateFn, trimmedTopic, file, remaining]);

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
                    <Loader2 className="size-4 animate-spin" /> Synthesizing…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Generate Synthesis
                  </>
                )}
              </button>

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