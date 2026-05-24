import { createFileRoute } from "@tanstack/react-router";
<<<<<<< HEAD
import { requireAuthBeforeLoad } from "@/lib/auth-guard";
=======
import { requireAuthBeforeLoad } from "@/lib/route-auth";
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
import { useState } from "react";
import { Library as LibraryIcon, Search, Zap, Hash, MessageSquare, Clapperboard, Copy, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  beforeLoad: requireAuthBeforeLoad,
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Library — Nexus" },
      { name: "description", content: "Your saved hooks, captions, and shorts angles." },
    ],
  }),
});

type Kind = "hooks" | "captions" | "posts" | "shorts";

const KIND_META: Record<Kind, { label: string; icon: typeof Zap; tint: string }> = {
  hooks: { label: "Hook", icon: Zap, tint: "text-primary" },
  captions: { label: "Caption", icon: Hash, tint: "text-muted-foreground" },
  posts: { label: "Post", icon: MessageSquare, tint: "text-muted-foreground" },
  shorts: { label: "Short", icon: Clapperboard, tint: "text-muted-foreground" },
};

const SAMPLE: { id: string; topic: string; kind: Kind; text: string; date: string }[] = [
  { id: "1", topic: "Productivity for remote engineers", kind: "hooks", text: "I quit Slack for 7 days. Here's what 40 engineers told me about deep work.", date: "2d ago" },
  { id: "2", topic: "Productivity for remote engineers", kind: "captions", text: "Async > meetings. Change my mind. (You won't.) #remotework #engineering", date: "2d ago" },
  { id: "3", topic: "AI in creator tools", kind: "posts", text: "The next generation of creators won't write captions — they'll direct them.", date: "5d ago" },
  { id: "4", topic: "AI in creator tools", kind: "shorts", text: "POV: your editor finishes the cut before you finish the take.", date: "5d ago" },
  { id: "5", topic: "Indie SaaS launch", kind: "hooks", text: "$0 to $12k MRR in 90 days — without a single ad.", date: "1w ago" },
  { id: "6", topic: "Indie SaaS launch", kind: "captions", text: "Built in public. Shipped in chaos. Sold in silence. 🚀", date: "1w ago" },
];

const FILTERS: { key: Kind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hooks", label: "Hooks" },
  { key: "captions", label: "Captions" },
  { key: "posts", label: "Posts" },
  { key: "shorts", label: "Shorts" },
];

function LibraryPage() {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");

  const items = SAMPLE.filter((i) => {
    const matchesKind = filter === "all" || i.kind === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || i.text.toLowerCase().includes(q) || i.topic.toLowerCase().includes(q);
    return matchesKind && matchesQuery;
  });

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/70 px-8 backdrop-blur">
        <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
          Library / Saved Generations
        </h1>
        <div className="hidden h-8 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 font-mono text-[10px] font-medium uppercase tracking-widest sm:flex">
          <LibraryIcon className="size-3 text-primary" />
          {SAMPLE.length} archived
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl animate-fade-up space-y-6 p-6 md:p-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Your archive.</h2>
          <p className="text-sm text-muted-foreground">
            Every hook, caption, post, and shorts angle you've generated, in one searchable feed.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topic or text…"
              className="h-10 w-full rounded-lg border border-border bg-card/30 pl-9 pr-3 text-sm backdrop-blur-xl placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
                  filter === f.key
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-card/30 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary ring-1 ring-border">
              <LibraryIcon className="size-5 text-primary" />
            </div>
            <p className="text-sm font-medium">No matches.</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">Try a different keyword or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <LibraryCard key={item.id} item={item} delay={i * 60} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LibraryCard({
  item,
  delay,
}: {
  item: { id: string; topic: string; kind: Kind; text: string; date: string };
  delay: number;
}) {
  const [copied, setCopied] = useState(false);
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const copy = async () => {
    await navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div
      className="group animate-fade-up rounded-2xl border border-border bg-card/40 p-4 backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-card/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]", meta.tint)}>
          <Icon className="size-3" /> {meta.label}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{item.date}</span>
      </div>
      <p className="text-sm leading-relaxed">{item.text}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="truncate text-[11px] text-muted-foreground">{item.topic}</span>
        <button
          onClick={copy}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Copy"
        >
          {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}