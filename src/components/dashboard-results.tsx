import { memo, useCallback, useState } from "react";
import { Check, Copy, Hash, MessageSquare, Clapperboard, Zap, Flame, TrendingUp, Heart, Crosshair, Radio, Eye } from "lucide-react";
import type { GeneratedAssets, ScoredAsset } from "@/lib/generate.functions";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "hooks" as const, label: "Viral Hooks", icon: Zap, accent: true },
  { key: "captions" as const, label: "AI Captions", icon: Hash, accent: false },
  { key: "posts" as const, label: "Tweet / Post Ideas", icon: MessageSquare, accent: false },
  { key: "shorts" as const, label: "Shorts Angles", icon: Clapperboard, accent: false },
];

function ResultsGridImpl({ results }: { results: GeneratedAssets }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {SECTIONS.map((s, i) => (
        <div
          key={s.key}
          className="animate-fade-up rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-primary/30 hover:bg-card/60"
          style={{ animationDelay: `${i * 60}ms`, contentVisibility: "auto" }}
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
          <div className="space-y-3">
            {results[s.key].map((item, j) => (
              <ResultLine key={j} item={item} highlight={s.accent && j === 0} delay={j * 40} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const ResultsGrid = memo(ResultsGridImpl);
export default ResultsGrid;

function tierClasses(score: number) {
  // Returns [text/glow class, bar gradient class]
  if (score >= 80)
    return {
      text: "text-primary",
      ring: "shadow-[0_0_18px_-2px_hsl(var(--primary)/0.55)] border-primary/50",
      bar: "bg-gradient-to-r from-primary via-primary to-primary/70",
      label: "ELITE",
    };
  if (score >= 60)
    return {
      text: "text-foreground",
      ring: "border-primary/25",
      bar: "bg-gradient-to-r from-primary/80 to-primary/40",
      label: "STRONG",
    };
  if (score >= 40)
    return {
      text: "text-muted-foreground",
      ring: "border-border",
      bar: "bg-gradient-to-r from-muted-foreground/60 to-muted-foreground/30",
      label: "AVG",
    };
  return {
    text: "text-muted-foreground/70",
    ring: "border-border/60",
    bar: "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10",
    label: "LOW",
  };
}

const ScoreBar = memo(function ScoreBar({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  delay: number;
}) {
  const t = tierClasses(value);
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("size-3 shrink-0", t.text)} />
      <span className="w-16 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out", t.bar)}
          style={{ width: `${value}%`, transitionDelay: `${delay}ms` }}
        />
      </div>
      <span className={cn("w-7 text-right font-mono text-[10px] tabular-nums", t.text)}>{value}</span>
    </div>
  );
});

const ResultLine = memo(function ResultLine({
  item,
  highlight,
  delay,
}: {
  item: ScoredAsset;
  highlight?: boolean;
  delay: number;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [item.text]);

  const viral = item.virality;
  const t = tierClasses(viral);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-background/60 p-3 transition-colors",
        t.ring,
        "hover:bg-background",
      )}
    >
      {/* top row: text + copy + viral score chip */}
      <div className="flex items-start justify-between gap-3">
        <p className={cn("flex-1 text-xs leading-relaxed", highlight ? "text-foreground" : "text-muted-foreground")}>
          {item.text}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div
            className={cn(
              "flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums",
              t.ring,
              t.text,
            )}
          >
            <Flame className="size-2.5" />
            {viral}
          </div>
          <button
            onClick={copy}
            aria-label="Copy"
            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* scores */}
      <div className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
        <ScoreBar icon={Flame} label="Viral" value={item.virality} delay={delay} />
        <ScoreBar icon={TrendingUp} label="Engage" value={item.engagement} delay={delay + 80} />
        <ScoreBar icon={Heart} label="Emotion" value={item.emotion} delay={delay + 160} />
        <ScoreBar icon={Crosshair} label="Hook" value={item.hookStrength} delay={delay + 240} />
        <ScoreBar icon={Radio} label="Trend" value={item.trendAlignment} delay={delay + 320} />
        <ScoreBar icon={Eye} label="Retain" value={item.audienceRetention} delay={delay + 400} />
      </div>

      {/* tier label */}
      <span
        className={cn(
          "pointer-events-none absolute right-2 top-2 font-mono text-[8px] uppercase tracking-[0.2em] opacity-40",
          t.text,
        )}
      >
        {t.label}
      </span>
    </div>
  );
});
