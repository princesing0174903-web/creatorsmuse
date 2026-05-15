import { memo, useCallback, useState } from "react";
import { Check, Copy, Hash, MessageSquare, Clapperboard, Zap } from "lucide-react";
import type { GeneratedAssets } from "@/lib/generate.functions";
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

const ResultsGrid = memo(ResultsGridImpl);
export default ResultsGrid;

const ResultLine = memo(function ResultLine({
  text,
  highlight,
}: {
  text: string;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [text]);
  return (
    <button
      onClick={copy}
      className={cn(
        "group flex w-full items-start justify-between gap-3 rounded-lg border-l-2 bg-background/50 p-3 text-left text-xs leading-relaxed transition-colors",
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
});