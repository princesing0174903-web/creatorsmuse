import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Upload,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Film,
  Hash,
  MessageSquare,
  Clapperboard,
  Zap,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { generateAssets, type GeneratedAssets } from "@/lib/generate.functions";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedAssets | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const generateFn = useServerFn(generateAssets);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const generate = async () => {
    if (!topic.trim() && !file) return;
    setLoading(true);
    setResults(null);
    try {
      const r = await generateFn({
        data: {
          topic: topic.trim() || (file ? `Video clip: ${file.name}` : ""),
          fileName: file?.name,
        },
      });
      setResults(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <AppShell>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/70 px-8 backdrop-blur">
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
                    "group relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/30 backdrop-blur-xl ring-1 ring-transparent transition-all",
                    "hover:border-primary/40 hover:ring-primary/20 hover:bg-card/40",
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
                  className="min-h-[120px] w-full rounded-xl border border-border bg-card/30 p-4 text-sm backdrop-blur-xl placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                onClick={generate}
                disabled={loading || (!topic.trim() && !file)}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all",
                  "shadow-glow hover:scale-[1.01] active:scale-[0.99]",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
                  !loading && !(!topic.trim() && !file) && "animate-pulse-glow",
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

              <div className="rounded-xl border border-border bg-card/20 p-4 backdrop-blur-xl">
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
              {!results && !loading && <EmptyState />}
              {loading && <LoadingState />}
              {results && <ResultsGrid results={results} />}
            </div>
          </div>
        </div>
    </AppShell>
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

const SECTIONS = [
  { key: "hooks" as const, label: "Viral Hooks", icon: Zap, accent: true },
  { key: "captions" as const, label: "AI Captions", icon: Hash },
  { key: "posts" as const, label: "Tweet / Post Ideas", icon: MessageSquare },
  { key: "shorts" as const, label: "Shorts Angles", icon: Clapperboard },
];

function ResultsGrid({ results }: { results: GeneratedAssets }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {SECTIONS.map((s, i) => (
        <div
          key={s.key}
          className="animate-fade-up rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-card/60"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="mb-4 flex items-start justify-between">
            <h3
              className={cn(
                "flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em]",
                s.accent ? "text-primary" : "text-muted-foreground",
              )}
            >
              <s.icon className="size-3" /> {s.label}
            </h3>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {results[s.key].length.toString().padStart(2, "0")} options
            </span>
          </div>
          <div className="space-y-2.5">
            {results[s.key].map((text, j) => (
              <ResultLine key={j} text={text} highlight={s.accent && j === 0} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultLine({ text, highlight }: { text: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={copy}
      className={cn(
        "group flex w-full items-start justify-between gap-3 rounded-lg border-l-2 bg-background/50 p-3 text-left text-xs leading-relaxed transition-all",
        highlight ? "border-primary/60" : "border-transparent hover:border-border",
        "hover:bg-background",
      )}
    >
      <span className={cn(highlight ? "text-foreground" : "text-muted-foreground")}>{text}</span>
      <span className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      </span>
    </button>
  );
}