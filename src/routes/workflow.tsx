import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useEffect, useMemo, useState } from "react";
import { Lightbulb, FileText, Clapperboard, Send, Plus, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workflow")({
  beforeLoad: requireAuthBeforeLoad,
  component: WorkflowPage,
  head: () => ({
    meta: [
      { title: "Content Workflow — Nexus" },
      { name: "description", content: "Move every idea through Idea → Script → Reel → Post with AI assist at each stage." },
    ],
  }),
});

type Stage = "idea" | "script" | "reel" | "post";
type Card = { id: string; title: string; note?: string; stage: Stage };

const STAGES: { key: Stage; label: string; icon: typeof Lightbulb; hint: string; accent: string }[] = [
  { key: "idea",   label: "Idea",   icon: Lightbulb,    hint: "Raw concept / angle",     accent: "from-primary/40 to-transparent" },
  { key: "script", label: "Script", icon: FileText,     hint: "Hook + beats + CTA",      accent: "from-primary/30 to-transparent" },
  { key: "reel",   label: "Reel",   icon: Clapperboard, hint: "Cut, edit, polish",       accent: "from-primary/30 to-transparent" },
  { key: "post",   label: "Post",   icon: Send,         hint: "Caption + schedule",      accent: "from-primary/40 to-transparent" },
];

const SEED: Card[] = [
  { id: "c1", stage: "idea",   title: "Why most creators burn out at 90 days", note: "Contrarian — blame the loop, not effort." },
  { id: "c2", stage: "idea",   title: "The 3-line hook formula I steal from journalists" },
  { id: "c3", stage: "script", title: "Cold open: 'I deleted 80% of my content.'", note: "Beats: shock → reason → payoff." },
  { id: "c4", stage: "reel",   title: "Interview clip: founder on shipping speed", note: "Cut 00:42–01:08, add b-roll." },
  { id: "c5", stage: "post",   title: "Thread: 5 mistakes I made monetizing too early" },
];

const STORAGE_KEY = "nexus.workflow.cards.v1";

function loadCards(): Card[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Card[];
    if (!Array.isArray(parsed)) return SEED;
    return parsed;
  } catch {
    return SEED;
  }
}

function WorkflowPage() {
  const [cards, setCards] = useState<Card[]>(SEED);
  const [drafting, setDrafting] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  // Hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    setCards(loadCards());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch {
      // ignore quota errors
    }
  }, [cards]);

  const byStage = useMemo(() => {
    const map: Record<Stage, Card[]> = { idea: [], script: [], reel: [], post: [] };
    for (const c of cards) map[c.stage].push(c);
    return map;
  }, [cards]);

  const move = (id: string, dir: 1 | -1) => {
    setCards((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const order: Stage[] = ["idea", "script", "reel", "post"];
      const i = order.indexOf(c.stage);
      const next = order[Math.max(0, Math.min(order.length - 1, i + dir))];
      return { ...c, stage: next };
    }));
  };
  const remove = (id: string) => setCards((p) => p.filter((c) => c.id !== id));
  const addIdea = () => {
    const t = draftTitle.trim();
    if (!t) return;
    setCards((p) => [{ id: `c${Date.now()}`, stage: "idea", title: t }, ...p]);
    setDraftTitle("");
    setDrafting(false);
  };

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

      <div className="mx-auto w-full max-w-7xl animate-fade-up space-y-6 p-8">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">
              Idea → Script → Reel → <span className="text-primary">Post</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Every piece moves through the pipeline. AI assists at every stage.
            </p>
          </div>
          {!drafting ? (
            <button
              onClick={() => setDrafting(true)}
              className="flex h-10 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="size-4" /> New idea
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addIdea(); if (e.key === "Escape") { setDrafting(false); setDraftTitle(""); } }}
                placeholder="Title your idea…"
                className="h-10 w-72 rounded-lg border border-border bg-card/40 px-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={addIdea} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s, idx) => (
            <div
              key={s.key}
              className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card/30 p-4 transition-colors hover:border-primary/30"
            >
              <div className={cn("mb-3 flex items-center justify-between rounded-lg bg-gradient-to-r p-3", s.accent)}>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md bg-background/60 ring-1 ring-primary/30">
                    <s.icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider">{s.label}</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{s.hint}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {byStage[s.key].length.toString().padStart(2, "0")}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {byStage[s.key].length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground">
                    Empty — drop ideas here
                  </div>
                )}
                {byStage[s.key].map((c) => (
                  <div
                    key={c.id}
                    className="group rounded-lg border border-border bg-background/50 p-3 transition-colors hover:border-primary/30 hover:bg-background/80"
                  >
                    <p className="text-xs font-medium leading-snug">{c.title}</p>
                    {c.note && <p className="mt-1 text-[11px] text-muted-foreground">{c.note}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <AssistLink stage={s.key} title={c.title} />
                      <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        {idx > 0 && (
                          <button
                            onClick={() => move(c.id, -1)}
                            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground hover:text-foreground"
                          >
                            ←
                          </button>
                        )}
                        {idx < STAGES.length - 1 && (
                          <button
                            onClick={() => move(c.id, 1)}
                            className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary hover:bg-primary/20"
                          >
                            Next <ArrowRight className="size-2.5" />
                          </button>
                        )}
                        <button
                          onClick={() => remove(c.id)}
                          className="rounded-md p-0.5 text-muted-foreground/60 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function AssistLink({ stage, title }: { stage: Stage; title: string }) {
  // Route every assist to the workbench/reels with the card title as topic seed
  const to = stage === "reel" ? "/reels" : "/dashboard";
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