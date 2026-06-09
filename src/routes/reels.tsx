import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useServerFn } from "@tanstack/react-start";
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { toast } from "sonner";
import {
  Upload, Film, Sparkles, Loader2, Play, Pause, SkipBack, SkipForward,
  Download, Copy, Check, Flame, Heart, Crosshair, Radio, Eye, TrendingUp,
  Rocket, X, RefreshCw, Share2, Volume2, VolumeX, MessageCircle, Send, Bookmark,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { generateReels, type GeneratedReel } from "@/lib/reels.functions";
import { Music2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/reels")({
  beforeLoad: requireAuthBeforeLoad,
  component: ReelsPage,
  head: () => ({
    meta: [
      { title: "ReelCut AI — Find your viral moments" },
      { name: "description", content: "Upload long-form video. AI extracts the best reels and plays them back inside a phone mockup with full export." },
    ],
  }),
});

const STUDIO_HANDOFF_KEY = "nexus.reel.studio.candidate";

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
function tier(v: number) {
  if (v >= 80) return { label: "ELITE", grad: "from-amber-400 via-amber-300 to-yellow-200", text: "text-amber-300", badge: "bg-amber-400/10 text-amber-300 ring-amber-400/40" };
  if (v >= 60) return { label: "STRONG", grad: "from-indigo-400 to-fuchsia-400", text: "text-indigo-300", badge: "bg-indigo-400/10 text-indigo-300 ring-indigo-400/40" };
  return { label: "AVG", grad: "from-zinc-500 to-zinc-400", text: "text-zinc-400", badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30" };
}

function ReelsPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [topic, setTopic] = useState("");
  const [reels, setReels] = useState<GeneratedReel[] | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 within reel
  const [exporting, setExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);
  const [bgmVol, setBgmVol] = useState(35);

  // ---- Procedural background music (Web Audio API) ----
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);
  const bgmStopRef = useRef<(() => void) | null>(null);

  const stopBgm = useCallback(() => {
    bgmStopRef.current?.();
    bgmStopRef.current = null;
  }, []);

  const startBgm = useCallback(() => {
    if (bgmStopRef.current) return;
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AC) return;
    const ctx = audioCtxRef.current ?? new AC();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const master = ctx.createGain();
    master.gain.value = (bgmVol / 100) * 0.45;
    master.connect(ctx.destination);
    bgmGainRef.current = master;

    // simple lofi chord loop + kick pattern
    const tempo = 92; // bpm
    const beat = 60 / tempo;
    const scale = [220.0, 261.6, 329.6, 392.0, 440.0, 523.2]; // A minor pentatonic-ish
    const chord = [164.8, 196.0, 246.9, 329.6]; // E3 G3 B3 E4
    let step = 0;
    let stopped = false;

    const sched = () => {
      if (stopped) return;
      const t = ctx.currentTime;
      // pad chord every 4 beats
      if (step % 8 === 0) {
        chord.forEach((f) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.14, t + 0.4);
          g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 7.5);
          o.connect(g).connect(master);
          o.start(t);
          o.stop(t + beat * 8);
        });
      }
      // melodic pluck
      const note = scale[(step * 3) % scale.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = note;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + beat);
      // kick every other beat
      if (step % 2 === 0) {
        const k = ctx.createOscillator();
        const kg = ctx.createGain();
        k.frequency.setValueAtTime(110, t);
        k.frequency.exponentialRampToValueAtTime(40, t + 0.18);
        kg.gain.setValueAtTime(0.5, t);
        kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        k.connect(kg).connect(master);
        k.start(t);
        k.stop(t + 0.25);
      }
      step++;
    };
    sched();
    const id = window.setInterval(sched, beat * 1000);
    bgmStopRef.current = () => {
      stopped = true;
      window.clearInterval(id);
      try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2); } catch { /* noop */ }
      window.setTimeout(() => { try { master.disconnect(); } catch { /* noop */ } }, 250);
    };
  }, [bgmVol]);

  // Sync BGM with playback + toggles
  useEffect(() => {
    if (playing && bgmOn) startBgm(); else stopBgm();
    return () => stopBgm();
  }, [playing, bgmOn, startBgm, stopBgm]);

  // Live volume updates
  useEffect(() => {
    if (bgmGainRef.current && audioCtxRef.current) {
      bgmGainRef.current.gain.setTargetAtTime((bgmVol / 100) * 0.45, audioCtxRef.current.currentTime, 0.05);
    }
  }, [bgmVol]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const runReels = useServerFn(generateReels);

  // Build object URL when file changes
  useEffect(() => {
    if (!file) { setVideoUrl(null); setDuration(0); return; }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const activeReel = reels?.[activeIdx] ?? null;

  // Whenever the active reel changes, seek to its start and play
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeReel) return;
    const seekAndPlay = () => {
      try {
        v.currentTime = activeReel.startSec;
        v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      } catch { /* noop */ }
    };
    if (v.readyState >= 1) seekAndPlay();
    else v.addEventListener("loadedmetadata", seekAndPlay, { once: true });
  }, [activeReel?.startSec, activeReel?.endSec, videoUrl, activeReel]);

  // Loop within reel window + progress
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !activeReel) return;
    const { startSec, endSec } = activeReel;
    if (v.currentTime >= endSec) {
      v.currentTime = startSec;
    }
    const span = Math.max(0.001, endSec - startSec);
    setProgress(Math.max(0, Math.min(1, (v.currentTime - startSec) / span)));
  }, [activeReel]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  }, []);

  const next = useCallback(() => {
    if (!reels) return;
    setActiveIdx((i) => (i + 1) % reels.length);
  }, [reels]);
  const prev = useCallback(() => {
    if (!reels) return;
    setActiveIdx((i) => (i - 1 + reels.length) % reels.length);
  }, [reels]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "ArrowDown" || e.code === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.code === "ArrowUp" || e.code === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, next, prev]);

  const run = useCallback(async () => {
    if (!topic.trim() && !file) {
      toast.error("Upload a video or describe the topic first");
      return;
    }
    setLoading(true);
    setReels(null);
    try {
      const r = await runReels({
        data: {
          topic: topic.trim() || `Video: ${file?.name ?? "untitled"}`,
          fileName: file?.name,
          durationSec: duration > 0 ? Math.round(duration) : undefined,
        },
      });
      setReels(r.reels);
      setActiveIdx(0);
      toast.success(`${r.reels.length} reels detected`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reel generation failed");
    } finally {
      setLoading(false);
    }
  }, [topic, file, duration, runReels]);

  const exportClip = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !activeReel || !videoUrl) {
      toast.error("Upload a video first to export the clip");
      return;
    }
    if (typeof (v as any).captureStream !== "function") {
      toast.error("Your browser doesn't support clip export. Try Chrome.");
      return;
    }
    setExporting(true);
    try {
      v.muted = false;
      v.currentTime = activeReel.startSec;
      await new Promise<void>((res) => {
        const onSeeked = () => { v.removeEventListener("seeked", onSeeked); res(); };
        v.addEventListener("seeked", onSeeked);
      });
      const stream = (v as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
      const mimes = ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
      const mime = mimes.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime })); });
      rec.start();
      await v.play();
      const span = Math.max(0.1, activeReel.endSec - activeReel.startSec);
      await new Promise((r) => setTimeout(r, span * 1000 + 150));
      rec.stop();
      const blob = await done;
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(activeReel.title || "reel").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast.success("Clip exported");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
      v.muted = muted;
    }
  }, [activeReel, videoUrl, muted]);

  const copyCaption = useCallback(async () => {
    if (!activeReel) return;
    await navigator.clipboard.writeText(`${activeReel.hook}\n\n${activeReel.caption}`);
    toast.success("Hook + caption copied");
  }, [activeReel]);

  const sendToStudio = useCallback(() => {
    if (!activeReel) return;
    try {
      window.sessionStorage.setItem(STUDIO_HANDOFF_KEY, JSON.stringify({
        title: activeReel.title, hook: activeReel.hook, caption: activeReel.caption,
        reason: activeReel.reason, startSec: activeReel.startSec, endSec: activeReel.endSec,
        virality: activeReel.virality, topic: topic || activeReel.title,
      }));
    } catch { /* noop */ }
    navigate({ to: "/reels/studio" });
  }, [activeReel, topic, navigate]);

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-0px)] w-full bg-black text-white">
        {/* LEFT SIDEBAR */}
        <aside className="hidden w-[340px] shrink-0 flex-col border-r border-white/5 bg-[#0a0a0a] lg:flex">
          <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4">
            <div className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-[0_0_24px_-4px_rgba(217,70,239,0.7)]">
              <Film className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">ReelCut AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Viral moment engine</p>
            </div>
          </div>

          <div className="space-y-4 border-b border-white/5 p-5">
            <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button
              onClick={() => inputRef.current?.click()}
              className={cn(
                "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-all hover:border-white/20 hover:bg-white/[0.04]",
                file && "border-fuchsia-500/30",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500">
                <Upload className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {file ? file.name : "Upload video"}
                </p>
                <p className="text-[10px] text-white/40">
                  {file ? `${(file.size / 1048576).toFixed(1)} MB · ${duration > 0 ? fmt(duration) : "loading…"}` : "MP4 · MOV · WEBM"}
                </p>
              </div>
              {file && (
                <span onClick={(e) => { e.stopPropagation(); setFile(null); setReels(null); }}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-md text-white/40 hover:bg-white/5 hover:text-white">
                  <X className="size-3.5" />
                </span>
              )}
            </button>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What's the video about? (e.g. 'YC founder interview on burnout')"
              className="min-h-[80px] w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white placeholder:text-white/30 focus:border-fuchsia-500/40 focus:outline-none"
            />

            <button
              onClick={run}
              disabled={loading}
              className="group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-xs font-bold uppercase tracking-widest shadow-[0_0_32px_-8px_rgba(217,70,239,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : <><Sparkles className="size-4" /> Generate Reels</>}
            </button>
          </div>

          <div className="flex items-center justify-between px-5 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Generated Reels</p>
            {reels && (
              <button onClick={run} disabled={loading} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] uppercase tracking-widest text-white/40 hover:bg-white/5 hover:text-white">
                <RefreshCw className="size-3" /> Re-run
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-6 pt-2">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-xl bg-white/[0.03]" />
            ))}
            {!loading && !reels && (
              <div className="mt-8 px-4 text-center text-[11px] text-white/30">
                Upload a video & hit Generate to see AI-cut reels appear here.
              </div>
            )}
            {!loading && reels?.map((r, i) => {
              const t = tier(r.virality);
              const active = i === activeIdx;
              return (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-xl border bg-[#111] p-3 text-left transition-all",
                    active
                      ? "border-fuchsia-500/40 shadow-[0_0_24px_-6px_rgba(217,70,239,0.55)]"
                      : "border-white/5 hover:border-white/15 hover:bg-[#161616]",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-purple-500 via-fuchsia-500 to-pink-500" />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-[13px] font-semibold">
                      <span className="mr-1 text-white/30">{(i + 1).toString().padStart(2, "0")}.</span>
                      {r.title}
                    </p>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums ring-1", t.badge)}>
                      {r.virality}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={cn("rounded-md bg-gradient-to-r px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-black", t.grad)}>
                      {t.label}
                    </span>
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-white/60">
                      {Math.max(1, Math.round(r.endSec - r.startSec))}s
                    </span>
                    <span className="font-mono text-[9px] text-white/30">
                      {fmt(r.startSec)} → {fmt(r.endSec)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-md bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-fuchsia-300">
                      <Play className="size-2.5 fill-current" /> Play
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* MAIN PANEL */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-black">
          {!reels && !loading && <EmptyState hasFile={!!file} />}
          {loading && <LoadingState />}

          {activeReel && (
            <>
              {/* top bar */}
              <div className="flex items-center justify-between border-b border-white/5 px-8 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-400">Now playing · {(activeIdx + 1).toString().padStart(2, "0")} of {reels?.length}</p>
                  <h2 className="mt-0.5 truncate text-xl font-bold">{activeReel.title}</h2>
                </div>
                <div className="hidden items-center gap-1.5 md:flex">
                  <ScoreChip label="Viral" v={activeReel.virality} icon={Flame} />
                  <ScoreChip label="Engage" v={activeReel.engagement} icon={TrendingUp} />
                  <ScoreChip label="Emotion" v={activeReel.emotion} icon={Heart} />
                  <ScoreChip label="Hook" v={activeReel.hookStrength} icon={Crosshair} />
                  <ScoreChip label="Trend" v={activeReel.trendAlignment} icon={Radio} />
                  <ScoreChip label="Retain" v={activeReel.audienceRetention} icon={Eye} />
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center gap-10 overflow-y-auto px-4 py-6">
                {/* PHONE MOCKUP */}
                <div className="relative shrink-0">
                  <div className="relative h-[640px] w-[300px] rounded-[44px] border-[10px] border-zinc-900 bg-black shadow-[0_30px_80px_-20px_rgba(217,70,239,0.35),inset_0_0_0_2px_rgba(255,255,255,0.04)]">
                    {/* Notch */}
                    <div className="absolute left-1/2 top-1.5 z-20 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
                    {/* Screen */}
                    <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-black">
                      {videoUrl ? (
                        <>
                          <video
                            ref={videoRef}
                            src={videoUrl}
                            muted={muted}
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                            onTimeUpdate={onTimeUpdate}
                            onPlay={() => setPlaying(true)}
                            onPause={() => setPlaying(false)}
                            onClick={togglePlay}
                            className="h-full w-full object-cover"
                          />
                          {!playing && (
                            <button
                              onClick={togglePlay}
                              className="absolute inset-0 z-10 flex items-center justify-center bg-black/30"
                            >
                              <span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-black backdrop-blur-md">
                                <Play className="size-6 fill-current" />
                              </span>
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
                          <Film className="size-7 text-white/30" />
                          <p className="text-[11px] text-white/40">Upload a video to play this reel inside the phone.</p>
                        </div>
                      )}

                      {/* Reel overlay UI */}
                      <div className="pointer-events-none absolute inset-0 flex">
                        {/* Right action rail */}
                        <div className="ml-auto flex flex-col items-center justify-end gap-4 px-3 pb-20 text-white">
                          <RailIcon icon={Heart} count="12.4K" />
                          <RailIcon icon={MessageCircle} count="384" />
                          <RailIcon icon={Send} count="Share" />
                          <RailIcon icon={Bookmark} count="Save" />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pb-4 pr-16">
                        <p className="text-[11px] font-bold">@reelcut.ai</p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug">{activeReel.hook}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-white/70">{activeReel.caption}</p>
                      </div>

                      {/* Mute toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
                        className="absolute right-3 top-10 z-20 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
                      >
                        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      </button>

                      {/* Progress bar */}
                      <div className="absolute inset-x-2 bottom-1.5 z-20 h-0.5 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-[width] duration-100"
                          style={{ width: `${progress * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: controls + details */}
                <div className="flex w-full max-w-sm flex-col gap-4">
                  <div className="rounded-2xl border border-white/5 bg-[#0c0c0c] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Hook</p>
                    <p className="mt-1 text-sm font-semibold leading-snug">{activeReel.hook}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Why this works</p>
                    <p className="mt-1 text-xs italic text-white/60">{activeReel.reason}</p>
                  </div>

                  {/* Playback controls */}
                  <div className="rounded-2xl border border-white/5 bg-[#0c0c0c] p-4">
                    <div className="flex items-center justify-center gap-2">
                      <CtrlBtn onClick={prev} icon={SkipBack} label="Prev" />
                      <button
                        onClick={togglePlay}
                        className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[0_0_24px_-6px_rgba(217,70,239,0.7)] transition-transform hover:scale-105 active:scale-95"
                      >
                        {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
                      </button>
                      <CtrlBtn onClick={next} icon={SkipForward} label="Next" />
                    </div>
                    <div className="mt-4 flex items-center gap-2 font-mono text-[10px] tabular-nums text-white/50">
                      <span>{fmt(activeReel.startSec)}</span>
                      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" style={{ width: `${progress * 100}%` }} />
                      </div>
                      <span>{fmt(activeReel.endSec)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={exportClip}
                      disabled={exporting || !videoUrl}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold uppercase tracking-widest text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {exporting ? <><Loader2 className="size-4 animate-spin" /> Exporting…</> : <><Download className="size-4" /> Export Clip</>}
                    </button>
                    <button onClick={copyCaption}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold uppercase tracking-widest text-white hover:bg-white/[0.08]">
                      <Copy className="size-4" /> Copy Caption
                    </button>
                    <button onClick={() => setShareOpen(true)}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold uppercase tracking-widest text-white hover:bg-white/[0.08]">
                      <Share2 className="size-4" /> Share
                    </button>
                    <button onClick={sendToStudio}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90">
                      <Rocket className="size-4" /> Studio
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {shareOpen && activeReel && (
            <ShareModal reel={activeReel} onClose={() => setShareOpen(false)} />
          )}
        </main>
      </div>
    </AppShell>
  );
}

function ScoreChip({ label, v, icon: Icon }: { label: string; v: number; icon: typeof Flame }) {
  const t = tier(v);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest ring-1", t.badge)}>
      <Icon className="size-2.5" /> {label} <span className="tabular-nums">{v}</span>
    </span>
  );
}

function CtrlBtn({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Play; label: string }) {
  return (
    <button onClick={onClick}
      className="flex size-11 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/80 transition hover:bg-white/[0.08] hover:text-white"
      title={label}
    >
      <Icon className="size-4" />
    </button>
  );
}

function RailIcon({ icon: Icon, count }: { icon: typeof Heart; count: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex size-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
        <Icon className="size-4" />
      </div>
      <span className="text-[9px] font-semibold text-white/80">{count}</span>
    </div>
  );
}

function EmptyState({ hasFile }: { hasFile: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="relative">
        <div className="absolute -inset-10 rounded-full bg-gradient-to-r from-purple-600/20 via-fuchsia-500/20 to-pink-500/20 blur-3xl" />
        <div className="relative flex size-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <Film className="size-9 text-fuchsia-400" />
        </div>
      </div>
      <h2 className="mt-8 text-3xl font-bold tracking-tight">
        Cut <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">viral reels</span> from any video
      </h2>
      <p className="mt-3 max-w-md text-sm text-white/50">
        {hasFile
          ? "Video loaded. Hit Generate Reels in the sidebar — AI will find the 5 highest-scoring moments and play them right here inside a real phone mockup."
          : "Upload a long video in the sidebar. AI scores every moment, picks the top 5 reels, and plays each one back so you can publish in one click."}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="relative size-16">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-400" />
        <div className="absolute inset-2 animate-spin rounded-full border-2 border-purple-500/20 border-b-purple-400" style={{ animationDirection: "reverse", animationDuration: "1.4s" }} />
      </div>
      <p className="mt-6 text-sm font-semibold tracking-wide">AI is finding your viral moments…</p>
      <p className="mt-1 text-xs text-white/40">Scoring hook strength, retention, and trend alignment</p>
    </div>
  );
}

function ShareModal({ reel, onClose }: { reel: GeneratedReel; onClose: () => void }) {
  const platforms = useMemo(() => ([
    { name: "Instagram Reels", url: "https://www.instagram.com/", grad: "from-fuchsia-500 via-pink-500 to-amber-400" },
    { name: "TikTok", url: "https://www.tiktok.com/upload", grad: "from-cyan-400 via-white to-pink-500" },
    { name: "YouTube Shorts", url: "https://www.youtube.com/upload", grad: "from-red-500 to-red-400" },
    { name: "X / Twitter", url: "https://twitter.com/compose/tweet", grad: "from-zinc-200 to-zinc-400" },
  ]), []);
  const [copied, setCopied] = useState(false);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Publish reel</h3>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-white/50 hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        <p className="mt-1 text-xs text-white/40">Export the clip first, then upload to your platform of choice.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {platforms.map((p) => (
            <a key={p.name} href={p.url} target="_blank" rel="noreferrer"
              className={cn("flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:bg-white/[0.05]")}>
              <span className={cn("h-1.5 w-10 rounded-full bg-gradient-to-r", p.grad)} />
              <span className="text-xs font-bold">{p.name}</span>
              <span className="text-[10px] text-white/40">Open upload</span>
            </a>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Caption ({reel.caption.length}/2200)</p>
          <p className="mt-1 line-clamp-3 text-xs text-white/80">{reel.hook}{"\n\n"}{reel.caption}</p>
          <button
            onClick={async () => { await navigator.clipboard.writeText(`${reel.hook}\n\n${reel.caption}`); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
            className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-md bg-white text-[11px] font-bold uppercase tracking-widest text-black hover:opacity-90">
            {copied ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy caption</>}
          </button>
        </div>
      </div>
    </div>
  );
}