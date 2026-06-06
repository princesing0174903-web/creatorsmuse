import { createFileRoute } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Upload, Film, X, Sparkles, Loader2, Scissors, Brain, Wand2, Gauge,
  Flame, TrendingUp, Heart, Crosshair, Copy, Check, Play, Radio, Eye, Rocket,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { generateReels, type GeneratedReel } from "@/lib/reels.functions";

export const Route = createFileRoute("/reels")({
  beforeLoad: requireAuthBeforeLoad,
  component: ReelsPage,
  head: () => ({
    meta: [
      { title: "AI Reel Generator — Nexus" },
      { name: "description", content: "Upload a video, let the AI engine extract the highest-virality reels with hooks, captions, and scores." },
    ],
  }),
});

const STAGES = [
  { key: "ingest", label: "Ingesting source", icon: Film },
  { key: "transcribe", label: "Transcribing audio", icon: Brain },
  { key: "scan", label: "Scanning for peak moments", icon: Gauge },
  { key: "score", label: "Scoring virality vectors", icon: Flame },
  { key: "cut", label: "Cutting reel candidates", icon: Scissors },
  { key: "polish", label: "Polishing hooks & captions", icon: Wand2 },
] as const;

function ReelsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [reels, setReels] = useState<GeneratedReel[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const runReels = useServerFn(generateReels);
  const lastTopic = useRef("");

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const canRun = !!topic.trim() || !!file;

  // Drive the pipeline animation while AI runs
  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const id = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 850);
    return () => clearInterval(id);
  }, [loading]);

  const run = useCallback(async () => {
    if (!canRun) return;
    setLoading(true);
    setReels(null);
    try {
      lastTopic.current = topic.trim() || `Video: ${file?.name ?? "untitled"}`;
      const r = await runReels({
        data: {
          topic: topic.trim() || `Video: ${file?.name ?? "untitled"}`,
          fileName: file?.name,
        },
      });
      setReels(r.reels);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reel generation failed");
    } finally {
      setLoading(false);
    }
  }, [canRun, runReels, topic, file]);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-8">
        <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
          AI Reel Generator
        </h1>
        <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 font-mono text-[10px] uppercase tracking-widest">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Reel Engine Online
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl animate-fade-up space-y-8 p-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">
            Cut the <span className="text-primary">viral moments</span>, automatically.
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload a long video or describe one. The engine finds the 5 highest-scoring reel candidates.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-5 lg:col-span-5">
            <div className="space-y-2">
              <label className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                Source video
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
                      <p className="max-w-[16rem] truncate text-sm font-medium">{file.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB · ready
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
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
                      <p className="text-sm font-medium">Drop long-form video</p>
                      <p className="mt-1 text-xs text-muted-foreground">Podcasts, interviews, vlogs — MP4 / MOV</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                Topic / context
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What's the video about? Who's in it, what's the big idea? e.g. 'Interview with a YC founder on burnout and shipping speed'…"
                className="min-h-[120px] w-full rounded-xl border border-border bg-card/40 p-4 text-sm placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={run}
              disabled={loading || !canRun}
              className={cn(
                "flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground transition-transform",
                "shadow-glow hover:scale-[1.01] active:scale-[0.99]",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
              )}
            >
              {loading ? (
                <><Loader2 className="size-4 animate-spin" /> Extracting reels…</>
              ) : (
                <><Sparkles className="size-4" /> Generate Best Reels</>
              )}
            </button>
          </div>

          <div className="col-span-12 lg:col-span-7">
            {loading && <Pipeline current={stage} />}
            {!loading && !reels && <EmptyReels />}
            {!loading && reels && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                    <Flame className="mr-1 inline size-3" /> Reels detected
                  </h3>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {reels.length.toString().padStart(2, "0")} candidates
                  </span>
                </div>
                {reels.map((r, i) => (
                  <ReelCard key={i} reel={r} index={i} topic={lastTopic.current} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Pipeline({ current }: { current: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
          AI Pipeline
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Stage {Math.min(current + 1, STAGES.length).toString().padStart(2, "0")} / {STAGES.length.toString().padStart(2, "0")}
        </span>
      </div>
      {STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={s.key}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
              done && "border-primary/30 bg-primary/5",
              active && "border-primary/60 bg-primary/10 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]",
              !done && !active && "border-border bg-background/40 opacity-60",
            )}
          >
            <div className={cn(
              "flex size-8 items-center justify-center rounded-md",
              active ? "bg-primary/20 text-primary" : done ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
            )}>
              {active ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" /> : <s.icon className="size-4" />}
            </div>
            <span className={cn(
              "flex-1 text-sm",
              active ? "text-foreground" : "text-muted-foreground",
            )}>{s.label}</span>
            {active && (
              <div className="h-1 w-24 overflow-hidden rounded-full bg-muted/40">
                <div className="h-full w-full origin-left animate-pulse bg-gradient-to-r from-primary to-primary/30" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyReels() {
  return (
    <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-secondary ring-1 ring-border">
        <Scissors className="size-6 text-primary" />
      </div>
      <p className="text-sm font-medium">Your reel candidates will appear here.</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Upload a video or describe one, hit generate — the engine returns 5 scored cut points with hooks and captions.
      </p>
    </div>
  );
}

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function tier(v: number) {
  if (v >= 80) return { label: "ELITE", text: "text-primary", ring: "border-primary/50 shadow-[0_0_18px_-4px_hsl(var(--primary)/0.55)]" };
  if (v >= 60) return { label: "STRONG", text: "text-foreground", ring: "border-primary/25" };
  if (v >= 40) return { label: "AVG", text: "text-muted-foreground", ring: "border-border" };
  return { label: "LOW", text: "text-muted-foreground/70", ring: "border-border/60" };
}

function ScoreRow({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: number }) {
  const t = tier(value);
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("size-3 shrink-0", t.text)} />
      <span className="w-14 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
            value >= 80 ? "from-primary to-primary/70" : value >= 60 ? "from-primary/80 to-primary/40" : "from-muted-foreground/60 to-muted-foreground/20")}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("w-7 text-right font-mono text-[10px] tabular-nums", t.text)}>{value}</span>
    </div>
  );
}

function ReelCard({ reel, index }: { reel: GeneratedReel; index: number }) {
  const t = tier(reel.virality);
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(`${reel.hook}\n\n${reel.caption}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [reel.hook, reel.caption]);

  return (
    <div
      className={cn(
        "group relative animate-fade-up overflow-hidden rounded-xl border bg-card/40 p-4 transition-colors hover:bg-card/60",
        t.ring,
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
          <Play className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-semibold">{reel.title}</h4>
            <div className={cn("flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums", t.ring, t.text)}>
              <Flame className="size-2.5" /> {reel.virality}
            </div>
          </div>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {fmt(reel.startSec)} → {fmt(reel.endSec)} · {Math.max(0, Math.round(reel.endSec - reel.startSec))}s
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-widest text-primary/70">Hook</p>
          <p className="text-xs font-medium">{reel.hook}</p>
        </div>
        <div>
          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Caption</p>
          <p className="text-xs text-muted-foreground">{reel.caption}</p>
        </div>
        <div>
          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Why this works</p>
          <p className="text-xs italic text-muted-foreground">{reel.reason}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
        <ScoreRow icon={Flame} label="Viral" value={reel.virality} />
        <ScoreRow icon={TrendingUp} label="Engage" value={reel.engagement} />
        <ScoreRow icon={Heart} label="Emotion" value={reel.emotion} />
        <ScoreRow icon={Crosshair} label="Hook" value={reel.hookStrength} />
        <ScoreRow icon={Radio} label="Trend" value={reel.trendAlignment} />
        <ScoreRow icon={Eye} label="Retain" value={reel.audienceRetention} />
      </div>

      <button
        onClick={copy}
        className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        aria-label="Copy hook + caption"
      >
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      </button>

      <span className={cn("pointer-events-none absolute bottom-2 right-3 font-mono text-[8px] uppercase tracking-[0.2em] opacity-40", t.text)}>
        {t.label}
      </span>
    </div>
  );
}