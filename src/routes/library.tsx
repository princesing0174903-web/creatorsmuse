import { createFileRoute } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useEffect, useMemo, useState } from "react";
import {
  Library as LibraryIcon,
  Search,
  Zap,
  Hash,
  MessageSquare,
  Clapperboard,
  Copy,
  Check,
  Star,
  StarOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Download,
  Loader2,
  FileText,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import {
  listMyAssets,
  updateAsset,
  deleteAsset,
} from "@/lib/workbench.functions";

export const Route = createFileRoute("/library")({
  beforeLoad: requireAuthBeforeLoad,
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Library — Creator’s Muse" },
      { name: "description", content: "Your saved hooks, captions, and shorts angles." },
    ],
  }),
});

type AssetType =
  | "hook" | "caption" | "post" | "short" | "reel" | "cover"
  | "note" | "title" | "script" | "reel_idea" | "cta" | "hashtag" | "content_plan" | "other";

interface AssetRow {
  id: string;
  asset_type: AssetType;
  title: string | null;
  content: string | null;
  scores: Record<string, number> | null;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

const TYPE_META: Record<string, { label: string; icon: typeof Zap; tint: string }> = {
  hook: { label: "Hook", icon: Zap, tint: "text-primary" },
  caption: { label: "Caption", icon: Hash, tint: "text-muted-foreground" },
  post: { label: "Post", icon: MessageSquare, tint: "text-muted-foreground" },
  short: { label: "Short", icon: Clapperboard, tint: "text-muted-foreground" },
  title: { label: "Title", icon: FileText, tint: "text-muted-foreground" },
  script: { label: "Script", icon: FileText, tint: "text-muted-foreground" },
  reel_idea: { label: "Reel", icon: Clapperboard, tint: "text-muted-foreground" },
  cta: { label: "CTA", icon: MessageSquare, tint: "text-muted-foreground" },
  hashtag: { label: "Hashtag", icon: Hash, tint: "text-muted-foreground" },
  content_plan: { label: "Plan", icon: FileText, tint: "text-muted-foreground" },
  reel: { label: "Reel", icon: Clapperboard, tint: "text-muted-foreground" },
  cover: { label: "Cover", icon: FileText, tint: "text-muted-foreground" },
  note: { label: "Note", icon: FileText, tint: "text-muted-foreground" },
  other: { label: "Other", icon: FileText, tint: "text-muted-foreground" },
};

const FILTERS: { key: "all" | AssetType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hook", label: "Hooks" },
  { key: "caption", label: "Captions" },
  { key: "post", label: "Posts" },
  { key: "short", label: "Shorts" },
  { key: "title", label: "Titles" },
  { key: "script", label: "Scripts" },
];

function useDebounced<T>(v: T, ms = 250): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function LibraryPage() {
  const [filter, setFilter] = useState<"all" | AssetType>("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"active" | "favorites" | "archived">("active");
  const debounced = useDebounced(query, 220);

  const listFn = useServerFn(listMyAssets);
  const updateFn = useServerFn(updateAsset);
  const deleteFn = useServerFn(deleteAsset);
  const qc = useQueryClient();

  const params = useMemo(
    () => ({
      search: debounced,
      types: filter === "all" ? [] : [filter],
      favoritesOnly: tab === "favorites",
      archived: (tab === "archived" ? "archived" : "active") as "active" | "archived",
      sort: "created_desc" as const,
      limit: 60,
      offset: 0,
    }),
    [debounced, filter, tab],
  );

  const q = useQuery({
    queryKey: ["library", params],
    queryFn: () => listFn({ data: params }),
  });

  const items = (q.data?.rows ?? []) as unknown as AssetRow[];
  const total = q.data?.total ?? 0;

  const updateMut = useMutation({
    mutationFn: (v: { id: string; patch: Partial<AssetRow> }) =>
      updateFn({ data: { id: v.id, patch: v.patch as Record<string, unknown> } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/70 px-8 backdrop-blur">
        <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
          Library / Saved Generations
        </h1>
        <div className="hidden h-8 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 font-mono text-[10px] font-medium uppercase tracking-widest sm:flex">
          <LibraryIcon className="size-3 text-primary" />
          {total} archived
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl animate-fade-up space-y-6 p-6 md:p-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Your archive.</h2>
          <p className="text-sm text-muted-foreground">
            Every hook, caption, post, and shorts angle you've generated, in one searchable feed.
          </p>
        </div>

        <div className="flex gap-1">
          {(["active", "favorites", "archived"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
                tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
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

        {q.isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary ring-1 ring-border">
              <LibraryIcon className="size-5 text-primary" />
            </div>
            <p className="text-sm font-medium">Nothing here yet.</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Head to the Workbench and hit Generate — every asset is autosaved.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <LibraryCard
                key={item.id}
                item={item}
                delay={i * 40}
                onFavorite={() =>
                  updateMut.mutate({ id: item.id, patch: { favorite: !item.favorite } })
                }
                onArchive={() =>
                  updateMut.mutate({ id: item.id, patch: { archived: !item.archived } })
                }
                onDelete={() => deleteMut.mutate(item.id)}
              />
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
  onFavorite,
  onArchive,
  onDelete,
}: {
  item: AssetRow;
  delay: number;
  onFavorite: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[item.asset_type] ?? TYPE_META.other;
  const Icon = meta.icon;
  const text = item.content ?? "";
  const topic =
    (item.metadata && typeof item.metadata === "object" && "topic" in item.metadata
      ? String((item.metadata as { topic?: unknown }).topic ?? "")
      : "") || item.title || "";
  const date = new Date(item.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const download = (ext: "txt" | "md") => {
    const blob = new Blob(
      [ext === "md" ? `# ${meta.label}\n\n${text}\n\n> ${topic}` : text],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.label.toLowerCase()}-${item.id.slice(0, 8)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
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
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{date}</span>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="truncate text-[11px] text-muted-foreground">{topic}</span>
        <div className="flex shrink-0 items-center gap-1">
          <IconBtn onClick={onFavorite} label={item.favorite ? "Unfavorite" : "Favorite"}>
            {item.favorite ? <Star className="size-3.5 text-primary" /> : <StarOff className="size-3.5" />}
          </IconBtn>
          <IconBtn onClick={copy} label="Copy">
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          </IconBtn>
          <IconBtn onClick={() => download("txt")} label="Download txt">
            <Download className="size-3.5" />
          </IconBtn>
          <IconBtn onClick={onArchive} label={item.archived ? "Restore" : "Archive"}>
            {item.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          </IconBtn>
          <IconBtn onClick={onDelete} label="Delete">
            <Trash2 className="size-3.5 hover:text-destructive" />
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  );
}