import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft, Sparkles, Loader2, Wand2, Copy, Check, Download, Film,
  Music2, Hash, MessageSquare, Send, Flame, ImageIcon, RefreshCw,
  ExternalLink, Lock, Play, Pause, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import {
  produceReel,
  refineReel,
  type ReelCandidate,
  type ReelProduction,
} from "@/lib/reel-studio.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reels/studio")({
  beforeLoad: requireAuthBeforeLoad,
  component: ReelStudioPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reel Studio — Nexus" },
      {
        name: "description",
        content: "Produce, refine and publish your AI-cut reel — storyboard, captions, cover art and a built-in AI director.",
      },
    ],
  }),
});

const STORAGE_KEY = "nexus.reel.studio.candidate";
const TONES = [
  { id: "punchy" as const, label: "Punchy" },
  { id: "cinematic" as const, label: "Cinematic" },
  { id: "educational" as const, label: "Educational" },
  { id: "story" as const, label: "Story" },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

function ReelStudioPage() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<ReelCandidate | null>(null);
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("punchy");
  const [production, setProduction] = useState<ReelProduction | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [producing, setProducing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const runProduce = useServerFn(produceReel);
  const runRefine = useServerFn(refineReel);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReelCandidate;
      setCandidate(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const produce = useCallback(async () => {
    if (!candidate) return;
    setProducing(true);
    setProduction(null);
    setCover(null);
    try {
      const { production: p, cover: c } = await runProduce({ data: { candidate, tone } });
      setProduction(p);
      setCover(c);
      setChat([
        {
          role: "assistant",
          content: `Reel is locked and loaded. Want me to make the hook sharper, change the music vibe, or rework a specific scene? Just tell me.`,
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Production failed");
    } finally {
      setProducing(false);
    }
  }, [candidate, runProduce, tone]);

  // Auto-produce on candidate load
  useEffect(() => {
    if (candidate && !production && !producing) {
      void produce();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, refining]);

  const sendChat = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!production || !chatInput.trim() || refining) return;
      const userMessage = chatInput.trim();
      const nextHistory: ChatMessage[] = [...chat, { role: "user", content: userMessage }];
      setChat(nextHistory);
      setChatInput("");
      setRefining(true);
      try {
        const { reply, patch } = await runRefine({
          data: {
            production,
            userMessage,
            history: chat.slice(-10),
          },
        });
        setProduction((prev) => (prev ? { ...prev, ...patch } : prev));
        setChat([...nextHistory, { role: "assistant", content: reply }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Refinement failed";
        setChat([...nextHistory, { role: "assistant", content: `⚠ ${msg}` }]);
        toast.error(msg);
      } finally {
        setRefining(false);
      }
    },
    [chat, chatInput, production, refining, runRefine],
  );

  if (!candidate) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary ring-1 ring-border">
            <Film className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">No reel selected</h1>
          <p className="text-sm text-muted-foreground">
            Head back to the Reel Generator, pick a candidate, and hit{" "}
            <span className="text-primary">Start this reel</span>.
          </p>
          <button
            onClick={() => navigate({ to: "/reels" })}
            className="mt-2 flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow"
          >
            <ArrowLeft className="size-4" /> Back to reels
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/reels"
            className="hidden h-8 items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-xs text-muted-foreground transition-colors hover:text-foreground md:flex"
          >
            <ArrowLeft className="size-3.5" /> Reels
          </Link>
          <h1 className="ml-10 truncate font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
            Reel Studio · <span className="text-foreground">{candidate.title}</span>
          </h1>
        </div>
        <div className="flex h-8 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 font-mono text-[10px] uppercase tracking-widest text-primary">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          {producing ? "Producing" : refining ? "Refining" : "Studio Live"}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-12 gap-6 p-4 md:p-8">
        {/* LEFT — Cover + storyboard */}
        <section className="col-span-12 space-y-5 lg:col-span-4">
          <CoverPanel
            cover={cover}
            producing={producing}
            candidate={candidate}
            tone={tone}
            onToneChange={setTone}
            onRegenerate={produce}
          />
          <StoryboardPanel production={production} producing={producing} />
        </section>

        {/* CENTER — Reel sheet */}
        <section className="col-span-12 space-y-5 lg:col-span-5">
          <ReelSheet
            production={production}
            producing={producing}
            candidate={candidate}
            onPatch={(p) => setProduction((prev) => (prev ? { ...prev, ...p } : prev))}
          />
          <ExportPanel
            production={production}
            cover={cover}
            candidate={candidate}
            onPatch={(p) => setProduction((prev) => (prev ? { ...prev, ...p } : prev))}
          />
          <PublishHub production={production} cover={cover} candidate={candidate} />
        </section>

        {/* RIGHT — AI Refiner */}
        <section className="col-span-12 lg:col-span-3">
          <ChatPanel
            chat={chat}
            chatInput={chatInput}
            onInput={setChatInput}
            onSend={sendChat}
            refining={refining}
            disabled={!production}
            scrollRef={chatScrollRef}
          />
        </section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Cover                                                                */
/* ------------------------------------------------------------------ */

function CoverPanel({
  cover, producing, candidate, tone, onToneChange, onRegenerate,
}: {
  cover: string | null;
  producing: boolean;
  candidate: ReelCandidate;
  tone: (typeof TONES)[number]["id"];
  onToneChange: (t: (typeof TONES)[number]["id"]) => void;
  onRegenerate: () => void;
}) {
  const downloadCover = () => {
    if (!cover) return;
    const a = document.createElement("a");
    a.href = cover;
    a.download = `${candidate.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60)}-cover.png`;
    a.click();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="relative aspect-[9/16] w-full bg-gradient-to-br from-primary/10 via-background to-background">
        {cover ? (
          <img src={cover} alt="Reel cover" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className={cn(
              "flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30",
              producing && "animate-pulse-glow",
            )}>
              {producing ? <Loader2 className="size-6 animate-spin text-primary" /> : <ImageIcon className="size-6 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {producing ? "Generating cover art…" : "Cover preview will appear here"}
            </p>
          </div>
        )}
        {producing && cover && (
          <div className="absolute inset-0 animate-shimmer" />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute left-3 top-3 flex h-6 items-center gap-1 rounded-md bg-black/40 px-2 font-mono text-[9px] uppercase tracking-widest text-white/90 backdrop-blur">
          <Flame className="size-2.5" /> {candidate.virality}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Tone preset</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => onToneChange(t.id)}
                className={cn(
                  "h-8 rounded-md border text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  tone === t.id
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            disabled={producing}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-secondary/50 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", producing && "animate-spin")} />
            Regenerate
          </button>
          <button
            onClick={downloadCover}
            disabled={!cover}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="size-3.5" /> PNG
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Storyboard                                                           */
/* ------------------------------------------------------------------ */

function StoryboardPanel({
  production, producing,
}: { production: ReelProduction | null; producing: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
          Storyboard
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {production ? production.scenes.length.toString().padStart(2, "0") : "—"} scenes
        </span>
      </div>
      {producing && !production && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border/60 bg-secondary/30" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}
      {production && (
        <ol className="space-y-2">
          {production.scenes.map((s, i) => (
            <li
              key={s.index}
              className="group animate-fade-up rounded-lg border border-border bg-background/40 p-3 transition-colors hover:border-primary/40"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 font-mono text-[10px] font-bold text-primary">
                  {s.index}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {fmt(s.startSec)} – {fmt(s.endSec)}
                </span>
              </div>
              <p className="text-xs font-semibold leading-snug text-foreground">{s.onScreenText}</p>
              <p className="mt-1 text-[11px] text-muted-foreground"><span className="text-primary/70">b-roll:</span> {s.bRoll}</p>
              <p className="mt-0.5 text-[11px] italic text-muted-foreground/80">"{s.voiceover}"</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reel sheet                                                           */
/* ------------------------------------------------------------------ */

function ReelSheet({
  production, producing, candidate, onPatch,
}: {
  production: ReelProduction | null;
  producing: boolean;
  candidate: ReelCandidate;
  onPatch: (p: Partial<ReelProduction>) => void;
}) {
  if (producing && !production) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-6">
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-secondary/40" />
        <div className="h-20 w-full animate-pulse rounded-md bg-secondary/40" />
        <div className="h-32 w-full animate-pulse rounded-md bg-secondary/40" />
      </div>
    );
  }
  if (!production) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
        <Wand2 className="size-5 text-primary" />
        <p className="text-sm font-medium">Producing your reel…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card/40 p-5">
      <SheetField
        label="Title"
        value={production.title}
        onChange={(v) => onPatch({ title: v })}
      />
      <SheetField
        label="Hook (first 1.5s spoken)"
        value={production.hook}
        onChange={(v) => onPatch({ hook: v })}
        accent
      />
      <SheetField
        label="Caption"
        value={production.caption}
        onChange={(v) => onPatch({ caption: v })}
        textarea
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SheetField
          label="Call to action"
          value={production.cta}
          onChange={(v) => onPatch({ cta: v })}
        />
        <SheetField
          label="Music vibe"
          value={production.musicVibe}
          onChange={(v) => onPatch({ musicVibe: v })}
          icon={Music2}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            <Hash className="mr-1 inline size-2.5" /> Hashtags
          </p>
          <CopyButton text={production.hashtags.map((h) => h.startsWith("#") ? h : `#${h}`).join(" ")} label="Copy all" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {production.hashtags.map((h, i) => (
            <span
              key={`${h}-${i}`}
              className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary"
            >
              {h.startsWith("#") ? h : `#${h}`}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Source cut</p>
          <p className="text-xs">{fmt(candidate.startSec)} → {fmt(candidate.endSec)} · {Math.max(0, Math.round(candidate.endSec - candidate.startSec))}s</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] font-bold text-primary">
          <Flame className="size-2.5" /> {candidate.virality} virality
        </div>
      </div>
    </div>
  );
}

function SheetField({
  label, value, onChange, textarea, accent, icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  accent?: boolean;
  icon?: typeof Music2;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
        {Icon && <Icon className="size-2.5" />}
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[90px] w-full rounded-lg border border-border bg-background/50 p-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-background/50 px-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring",
            accent && "border-primary/30 text-primary",
          )}
        />
      )}
    </label>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="flex h-7 items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Publish Hub                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Export Panel — render storyboard to a real downloadable MP4/WebM    */
/* ------------------------------------------------------------------ */

function pickRecorderMime(): { mime: string; ext: "mp4" | "webm" } {
  if (typeof MediaRecorder === "undefined") return { mime: "", ext: "webm" };
  const candidates: { mime: string; ext: "mp4" | "webm" }[] = [
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", ext: "webm" };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderReelToBlob(
  production: ReelProduction,
  coverDataUrl: string | null,
  onProgress: (pct: number) => void,
): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
  const W = 720;
  const H = 1280;
  const FPS = 30;

  // Normalize scene timings → cumulative seconds starting from 0
  const durations = production.scenes.map((s) =>
    Math.max(1.5, Math.min(10, s.endSec - s.startSec || 3)),
  );
  const total = durations.reduce((a, b) => a + b, 0);
  const starts: number[] = [];
  durations.reduce((acc, d, i) => {
    starts[i] = acc;
    return acc + d;
  }, 0);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  let coverImg: HTMLImageElement | null = null;
  if (coverDataUrl) {
    coverImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = coverDataUrl;
    }).catch(() => null);
  }

  const stream = (canvas as HTMLCanvasElement).captureStream(FPS);
  const { mime, ext } = pickRecorderMime();
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder not supported in this browser");
  }
  const recorder = mime
    ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 })
    : new MediaRecorder(stream, { videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
  });

  recorder.start(100);

  const startMs = performance.now();
  const drawFrame = (tSec: number) => {
    // background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0b0b10");
    grad.addColorStop(1, "#020205");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (coverImg) {
      // Ken Burns: slow zoom + drift
      const k = tSec / Math.max(0.001, total);
      const scale = 1.05 + k * 0.15;
      const dx = (k - 0.5) * 40;
      const cw = W * scale;
      const ch = H * scale;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(coverImg, (W - cw) / 2 + dx, (H - ch) / 2, cw, ch);
      ctx.globalAlpha = 1;
      // bottom darken for text legibility
      const od = ctx.createLinearGradient(0, H * 0.35, 0, H);
      od.addColorStop(0, "rgba(0,0,0,0)");
      od.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = od;
      ctx.fillRect(0, 0, W, H);
    }

    // find active scene
    let i = production.scenes.length - 1;
    for (let s = 0; s < production.scenes.length; s++) {
      if (tSec >= starts[s] && tSec < starts[s] + durations[s]) {
        i = s;
        break;
      }
    }
    const scene = production.scenes[i];
    const sceneT = tSec - starts[i];
    const sceneD = durations[i];

    // scene index chip
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(40, 60, 110, 44);
    ctx.fillStyle = "#a78bfa";
    ctx.font = "700 18px ui-sans-serif, system-ui, -apple-system";
    ctx.fillText(`SCENE ${String(scene.index).padStart(2, "0")}`, 56, 90);

    // hook (top) — always visible
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 36px ui-sans-serif, system-ui";
    const hookLines = wrapText(ctx, production.hook, W - 80);
    hookLines.slice(0, 3).forEach((ln, idx) => ctx.fillText(ln, 40, 170 + idx * 44));

    // big on-screen text with fade in/out
    const fade = Math.min(1, sceneT / 0.4) * Math.min(1, (sceneD - sceneT) / 0.4);
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 64px ui-sans-serif, system-ui";
    const lines = wrapText(ctx, scene.onScreenText, W - 80);
    const lh = 78;
    const blockH = lines.length * lh;
    const yStart = H / 2 - blockH / 2 + 40;
    lines.forEach((ln, idx) => {
      ctx.fillText(ln, 40, yStart + idx * lh);
    });
    ctx.globalAlpha = 1;

    // voiceover caption
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "italic 500 26px ui-sans-serif, system-ui";
    const vo = wrapText(ctx, `"${scene.voiceover}"`, W - 80);
    vo.slice(0, 3).forEach((ln, idx) => ctx.fillText(ln, 40, H - 220 + idx * 34));

    // CTA bar
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(40, H - 110, W - 80, 70);
    ctx.fillStyle = "#0b0b10";
    ctx.font = "800 28px ui-sans-serif, system-ui";
    const cta = production.cta.length > 38 ? production.cta.slice(0, 36) + "…" : production.cta;
    const ctaW = ctx.measureText(cta).width;
    ctx.fillText(cta, (W - ctaW) / 2, H - 65);

    // progress bar
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(40, 40, W - 80, 6);
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(40, 40, ((W - 80) * tSec) / total, 6);
  };

  await new Promise<void>((resolve) => {
    const frameInterval = 1000 / FPS;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const elapsed = (now - startMs) / 1000;
      if (now - last >= frameInterval - 2) {
        drawFrame(Math.min(elapsed, total));
        last = now;
        onProgress(Math.min(1, elapsed / total));
      }
      if (elapsed < total) {
        requestAnimationFrame(tick);
      } else {
        // small tail so recorder flushes
        setTimeout(() => {
          recorder.stop();
          resolve();
        }, 200);
      }
    };
    requestAnimationFrame(tick);
  });

  const blob = await done;
  stream.getTracks().forEach((t) => t.stop());
  return { blob, ext };
}

function ExportPanel({
  production, cover, candidate, onPatch,
}: {
  production: ReelProduction | null;
  cover: string | null;
  candidate: ReelCandidate;
  onPatch: (p: Partial<ReelProduction>) => void;
}) {
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [ext, setExt] = useState<"mp4" | "webm">("mp4");
  const [playing, setPlaying] = useState(false);
  const [autoEditing, setAutoEditing] = useState(false);
  const autoRenderedRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const runRefine = useServerFn(refineReel);

  useEffect(() => {
    // Reset preview if production changes
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setProgress(0);
    setPlaying(false);
  }, [production?.title, production?.hook]);

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const slug = (candidate.title || "reel").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "reel";

  const renderVideo = useCallback(async () => {
    if (!production) return;
    setRendering(true);
    setProgress(0);
    try {
      const { blob, ext: e } = await renderReelToBlob(production, cover, setProgress);
      const url = URL.createObjectURL(blob);
      setExt(e);
      setVideoUrl(url);
      toast.success(`Reel ready · ${(blob.size / (1024 * 1024)).toFixed(1)} MB`);
      // Auto-play once mounted
      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (v) {
          v.muted = true;
          v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Render failed");
    } finally {
      setRendering(false);
    }
  }, [production, cover]);

  // 🚀 Auto-render the first time a production lands so the reel actually plays
  useEffect(() => {
    if (!production) return;
    const key = `${production.title}::${production.hook}`;
    if (autoRenderedRef.current === key) return;
    if (rendering || videoUrl) return;
    autoRenderedRef.current = key;
    void renderVideo();
  }, [production, rendering, videoUrl, renderVideo]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const autoEdit = async () => {
    if (!production || autoEditing || rendering) return;
    setAutoEditing(true);
    try {
      const { patch } = await runRefine({
        data: {
          production,
          userMessage:
            "Auto-polish this reel for maximum virality. Tighten the hook to <8 words with a pattern interrupt, sharpen on-screen text in every scene, make the CTA punchier, and refresh hashtags with a balanced mix of broad + niche tags. Keep the topic and intent unchanged.",
          history: [],
        },
      });
      if (patch && Object.keys(patch).length > 0) {
        onPatch(patch);
        toast.success("AI polished your reel — re-rendering");
      } else {
        toast.message("Reel already looks tight — re-rendering");
        // Force a re-render even with no patch
        autoRenderedRef.current = null;
        void renderVideo();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-edit failed");
    } finally {
      setAutoEditing(false);
    }
  };

  if (!production) return null;

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${slug}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadThumb = () => {
    if (!cover) return;
    const a = document.createElement("a");
    a.href = cover;
    a.download = `${slug}-thumbnail.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
          <Film className="size-3" /> Player & Export
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          1080×1920 · 30fps
        </span>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-5">
          <div className="group relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-border bg-black">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  loop
                  muted
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  className="size-full object-cover"
                />
                {!playing && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
                    aria-label="Play reel"
                  >
                    <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-primary/30">
                      <Play className="size-7 translate-x-0.5 fill-current" />
                    </span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center">
                {rendering ? (
                  <>
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Auto-rendering {Math.round(progress * 100)}%
                    </p>
                    <div className="h-1 w-3/4 overflow-hidden rounded-full bg-muted/40">
                      <div className="h-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={renderVideo}
                    className="flex flex-col items-center gap-2"
                  >
                    <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-primary/30">
                      <Play className="size-7 translate-x-0.5 fill-current" />
                    </span>
                    <span className="text-xs text-muted-foreground">Tap to play your reel</span>
                  </button>
                )}
              </div>
            )}
          </div>
          {videoUrl && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={togglePlay}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/50 text-xs font-semibold transition-colors hover:bg-secondary"
              >
                {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => { const v = videoRef.current; if (v) { v.currentTime = 0; v.play(); } }}
                className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 text-xs font-semibold transition-colors hover:bg-secondary"
                title="Restart"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="col-span-12 space-y-2 sm:col-span-7">
          <button
            onClick={autoEdit}
            disabled={autoEditing || rendering}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary via-primary to-primary/80 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {autoEditing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            {autoEditing ? "AI auto-editing…" : "AI Auto-Edit & polish"}
          </button>
          <button
            onClick={renderVideo}
            disabled={rendering}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rendering ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {rendering ? `Rendering ${Math.round(progress * 100)}%` : videoUrl ? "Re-render reel" : "Render reel"}
          </button>
          <button
            onClick={downloadVideo}
            disabled={!videoUrl}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="size-4" /> Download {ext.toUpperCase()}
          </button>
          <button
            onClick={downloadThumb}
            disabled={!cover}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ImageIcon className="size-4" /> Download thumbnail PNG
          </button>
          <p className="rounded-md border border-border/60 bg-background/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
            Plays your reel in 9:16, rendered live in your browser. <span className="text-primary">Auto-Edit</span> sends the
            reel to an AI director that polishes the hook, scenes, CTA and hashtags — then re-renders automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Platform = {
  id: string;
  name: string;
  uploadUrl: string;
  intentUrl?: (caption: string) => string;
  badge?: "live" | "soon";
  color: string;
};

const PLATFORMS: Platform[] = [
  { id: "tiktok", name: "TikTok", uploadUrl: "https://www.tiktok.com/upload?lang=en", badge: "soon", color: "text-pink-400" },
  { id: "instagram", name: "Instagram Reels", uploadUrl: "https://www.instagram.com/reels/upload/", badge: "soon", color: "text-fuchsia-400" },
  { id: "youtube", name: "YouTube Shorts", uploadUrl: "https://www.youtube.com/upload", badge: "soon", color: "text-red-400" },
  {
    id: "x",
    name: "X / Twitter",
    uploadUrl: "https://twitter.com/compose/tweet",
    intentUrl: (c) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(c)}`,
    badge: "live",
    color: "text-sky-300",
  },
];

function PublishHub({
  production, cover, candidate,
}: {
  production: ReelProduction | null;
  cover: string | null;
  candidate: ReelCandidate;
}) {
  if (!production) return null;
  const fullCaption = `${production.hook}\n\n${production.caption}\n\n${production.hashtags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ")}\n\n${production.cta}`;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
          <Sparkles className="size-3" /> Publish
        </h3>
        <CopyButton text={fullCaption} label="Caption pack" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => (
          <PlatformCard key={p.id} platform={p} caption={fullCaption} cover={cover} candidate={candidate} />
        ))}
      </div>

      <p className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Direct native publishing into TikTok, Instagram and YouTube needs each platform's
        approved app & account link — coming soon. For now, we pre-pack your caption,
        hashtags and cover so it's a one-tap upload.
      </p>
    </div>
  );
}

function PlatformCard({
  platform, caption, cover, candidate,
}: {
  platform: Platform;
  caption: string;
  cover: string | null;
  candidate: ReelCandidate;
}) {
  const openUpload = () => {
    if (platform.intentUrl) {
      window.open(platform.intentUrl(caption), "_blank", "noopener,noreferrer");
    } else {
      window.open(platform.uploadUrl, "_blank", "noopener,noreferrer");
    }
  };
  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Caption copied — opening uploader");
    } catch {
      // ignore
    }
    setTimeout(openUpload, 400);
  };
  const downloadCover = () => {
    if (!cover) return;
    const a = document.createElement("a");
    a.href = cover;
    a.download = `${candidate.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60)}-${platform.id}-cover.png`;
    a.click();
  };

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-bold", platform.color)}>{platform.name}</span>
        {platform.badge === "soon" ? (
          <span className="flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
            <Lock className="size-2.5" /> Direct soon
          </span>
        ) : (
          <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-primary">
            Live
          </span>
        )}
      </div>
      <button
        onClick={copyAndOpen}
        className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
      >
        <ExternalLink className="size-3" />
        {platform.intentUrl ? "Tweet now" : "Open uploader"}
      </button>
      <button
        onClick={downloadCover}
        disabled={!cover}
        className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download className="size-3" /> Cover
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI Refiner Chat                                                       */
/* ------------------------------------------------------------------ */

const QUICK_PROMPTS = [
  "Make the hook shorter and punchier",
  "Add a stat to scene 1",
  "Rewrite the caption for Gen-Z",
  "Swap the CTA to drive newsletter signups",
];

function ChatPanel({
  chat, chatInput, onInput, onSend, refining, disabled, scrollRef,
}: {
  chat: ChatMessage[];
  chatInput: string;
  onInput: (v: string) => void;
  onSend: (e?: FormEvent) => void;
  refining: boolean;
  disabled: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="sticky top-20 flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
          <MessageSquare className="size-3" /> AI Director
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {refining ? "thinking…" : "ready"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-3 text-[11px] text-muted-foreground">
            Your AI co-director will appear here once the reel is produced.
          </div>
        )}
        {chat.map((m, i) => (
          <div
            key={i}
            className={cn(
              "animate-fade-up max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "border border-border bg-background/60",
            )}
          >
            {m.content}
          </div>
        ))}
        {refining && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin text-primary" />
            Rewriting reel…
          </div>
        )}
      </div>

      {chat.length > 0 && !refining && (
        <div className="border-t border-border/60 px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => onInput(q)}
                disabled={disabled}
                className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSend} className="flex gap-2 border-t border-border bg-background/40 p-3">
        <input
          value={chatInput}
          onChange={(e) => onInput(e.target.value)}
          placeholder={disabled ? "Producing…" : "Tell me how to upgrade this reel…"}
          disabled={disabled || refining}
          className="h-10 flex-1 rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={disabled || refining || !chatInput.trim()}
          className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {refining ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utils                                                                */
/* ------------------------------------------------------------------ */

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}