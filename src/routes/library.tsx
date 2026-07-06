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
  Pin,
  PinOff,
  Plus,
  FolderPlus,
  Folder,
  X,
  Tags,
  RotateCcw,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { listMyAssets, updateAsset } from "@/lib/workbench.functions";
import {
  listCollections,
  createCollection,
  deleteCollection,
  addAssetsToCollection,
  removeAssetsFromCollection,
  bulkUpdateAssets,
  bulkTagAssets,
  moveAssetsToTrash,
  restoreAssetsFromTrash,
  purgeAssets,
  emptyTrash,
  listAllTags,
} from "@/lib/library.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  pinned: boolean;
  deleted_at: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  asset_count: number;
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
  const [tab, setTab] = useState<"active" | "favorites" | "archived" | "trash">("active");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const debounced = useDebounced(query, 220);

  const listFn = useServerFn(listMyAssets);
  const updateFn = useServerFn(updateAsset);
  const listColsFn = useServerFn(listCollections);
  const listTagsFn = useServerFn(listAllTags);
  const createColFn = useServerFn(createCollection);
  const deleteColFn = useServerFn(deleteCollection);
  const addToColFn = useServerFn(addAssetsToCollection);
  const removeFromColFn = useServerFn(removeAssetsFromCollection);
  const bulkUpdateFn = useServerFn(bulkUpdateAssets);
  const bulkTagFn = useServerFn(bulkTagAssets);
  const trashFn = useServerFn(moveAssetsToTrash);
  const restoreFn = useServerFn(restoreAssetsFromTrash);
  const purgeFn = useServerFn(purgeAssets);
  const emptyTrashFn = useServerFn(emptyTrash);
  const qc = useQueryClient();

  const archivedState: "active" | "archived" | "trash" =
    tab === "trash" ? "trash" : tab === "archived" ? "archived" : "active";

  const params = useMemo(
    () => ({
      search: debounced,
      types: filter === "all" ? [] : [filter],
      favoritesOnly: tab === "favorites",
      archived: archivedState,
      collectionId: activeCollection,
      tags: activeTags,
      sort: "created_desc" as const,
      limit: 60,
      offset: 0,
    }),
    [debounced, filter, tab, archivedState, activeCollection, activeTags],
  );

  const q = useQuery({
    queryKey: ["library", params],
    queryFn: () => listFn({ data: params }),
  });

  const collectionsQ = useQuery({
    queryKey: ["library-collections"],
    queryFn: () => listColsFn(),
  });

  const tagsQ = useQuery({
    queryKey: ["library-tags"],
    queryFn: () => listTagsFn(),
  });

  const items = (q.data?.rows ?? []) as unknown as AssetRow[];
  const total = q.data?.total ?? 0;
  const collections = (collectionsQ.data ?? []) as Collection[];
  const tagCatalog = (tagsQ.data ?? []) as { tag: string; count: number }[];

  useEffect(() => {
    setSelected(new Set());
  }, [tab, filter, activeCollection, activeTags, debounced]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["library"] });
    qc.invalidateQueries({ queryKey: ["library-collections"] });
    qc.invalidateQueries({ queryKey: ["library-tags"] });
  };

  const updateMut = useMutation({
    mutationFn: (v: { id: string; patch: Partial<AssetRow> }) =>
      updateFn({ data: { id: v.id, patch: v.patch as Record<string, unknown> } }),
    onSuccess: () => invalidateAll(),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const trashMut = useMutation({
    mutationFn: (ids: string[]) => trashFn({ data: { ids } }),
    onSuccess: () => {
      toast.success("Moved to trash");
      setSelected(new Set());
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const restoreMut = useMutation({
    mutationFn: (ids: string[]) => restoreFn({ data: { ids } }),
    onSuccess: () => {
      toast.success("Restored");
      setSelected(new Set());
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const purgeMut = useMutation({
    mutationFn: (ids: string[]) => purgeFn({ data: { ids } }),
    onSuccess: () => {
      toast.success("Permanently deleted");
      setSelected(new Set());
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const bulkMut = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      bulkUpdateFn({ data: { ids: Array.from(selected), patch } }),
    onSuccess: () => {
      setSelected(new Set());
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const addToCollectionMut = useMutation({
    mutationFn: (collectionId: string) =>
      addToColFn({ data: { collectionId, assetIds: Array.from(selected) } }),
    onSuccess: () => {
      toast.success("Added to collection");
      setAssignOpen(false);
      setSelected(new Set());
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const createCollectionMut = useMutation({
    mutationFn: (name: string) => createColFn({ data: { name, icon: "folder" } }),
    onSuccess: () => {
      toast.success("Collection created");
      setNewCollectionName("");
      setNewCollectionOpen(false);
      qc.invalidateQueries({ queryKey: ["library-collections"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteCollectionMut = useMutation({
    mutationFn: (id: string) => deleteColFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Collection removed");
      if (activeCollection) setActiveCollection(null);
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeFromCollectionMut = useMutation({
    mutationFn: (assetId: string) =>
      activeCollection
        ? removeFromColFn({ data: { collectionId: activeCollection, assetIds: [assetId] } })
        : Promise.resolve({ ok: true }),
    onSuccess: () => {
      toast.success("Removed from collection");
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const emptyTrashMut = useMutation({
    mutationFn: () => emptyTrashFn(),
    onSuccess: () => {
      toast.success("Trash emptied");
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const promptTagBulk = async () => {
    const raw = window.prompt("Add tags (comma-separated):");
    if (!raw) return;
    const add = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (!add.length) return;
    try {
      await bulkTagFn({ data: { ids: Array.from(selected), add } });
      toast.success(`Tagged ${selected.size} items`);
      setSelected(new Set());
      invalidateAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/70 px-8 backdrop-blur">
        <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
          Library / Saved Generations
        </h1>
        <div className="hidden h-8 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 font-mono text-[10px] font-medium uppercase tracking-widest sm:flex">
          <LibraryIcon className="size-3 text-primary" />
          {total} items
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl animate-fade-up space-y-6 p-6 md:p-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Your archive.</h2>
          <p className="text-sm text-muted-foreground">
            Every hook, caption, post, and shorts angle you've generated, in one searchable feed.
          </p>
        </div>

        <div className="flex items-center gap-1">
          {(["active", "favorites", "archived", "trash"] as const).map((t) => (
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
          {tab === "trash" && total > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Permanently delete everything in trash?"))
                  emptyTrashMut.mutate();
              }}
              className="ml-auto rounded-md px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10"
            >
              Empty trash
            </button>
          )}
        </div>

        {/* Collections rail */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveCollection(null)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
              activeCollection === null
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-card/30 text-muted-foreground hover:text-foreground",
            )}
          >
            <LibraryIcon className="size-3" /> All items
          </button>
          {collections.map((c) => (
            <div key={c.id} className="group relative inline-flex">
              <button
                onClick={() => setActiveCollection(c.id === activeCollection ? null : c.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 pr-6 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
                  activeCollection === c.id
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-card/30 text-muted-foreground hover:text-foreground",
                )}
                title={c.description ?? c.name}
              >
                <Folder className="size-3" /> {c.name}
                <span className="ml-1 rounded bg-secondary/60 px-1 text-[9px] text-muted-foreground">
                  {c.asset_count}
                </span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete collection "${c.name}"? Assets stay in your library.`))
                    deleteCollectionMut.mutate(c.id);
                }}
                aria-label={`Delete ${c.name}`}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setNewCollectionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <FolderPlus className="size-3" /> New
          </button>
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

        {tagCatalog.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tags className="size-3 text-muted-foreground" />
            {tagCatalog.slice(0, 20).map((t) => {
              const active = activeTags.includes(t.tag);
              return (
                <button
                  key={t.tag}
                  onClick={() => toggleTag(t.tag)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[10px] transition-colors",
                    active
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-card/30 text-muted-foreground hover:text-foreground",
                  )}
                >
                  #{t.tag}
                  <span className="ml-1 text-muted-foreground/70">{t.count}</span>
                </button>
              );
            })}
            {activeTags.length > 0 && (
              <button
                onClick={() => setActiveTags([])}
                className="ml-1 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
              >
                clear
              </button>
            )}
          </div>
        )}

        {hasSelection && (
          <div className="sticky top-16 z-[5] flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 backdrop-blur-xl">
            <button
              onClick={toggleSelectAll}
              className="rounded-md border border-border bg-card/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              {selected.size === items.length ? "Deselect all" : "Select all"}
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {selectedCount} selected
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-1">
              {tab !== "trash" && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => bulkMut.mutate({ favorite: true })}>
                    <Star className="mr-1 size-3.5" /> Favorite
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => bulkMut.mutate({ pinned: true })}>
                    <Pin className="mr-1 size-3.5" /> Pin
                  </Button>
                  <Button size="sm" variant="ghost" onClick={promptTagBulk}>
                    <Tags className="mr-1 size-3.5" /> Tag
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAssignOpen(true)}>
                    <FolderPlus className="mr-1 size-3.5" /> Collection
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => bulkMut.mutate({ archived: tab !== "archived" })}>
                    {tab === "archived" ? (
                      <><ArchiveRestore className="mr-1 size-3.5" /> Restore</>
                    ) : (
                      <><Archive className="mr-1 size-3.5" /> Archive</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => trashMut.mutate(Array.from(selected))}
                  >
                    <Trash2 className="mr-1 size-3.5" /> Trash
                  </Button>
                </>
              )}
              {tab === "trash" && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => restoreMut.mutate(Array.from(selected))}>
                    <RotateCcw className="mr-1 size-3.5" /> Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Permanently delete ${selected.size} item(s)?`))
                        purgeMut.mutate(Array.from(selected));
                    }}
                  >
                    <Trash2 className="mr-1 size-3.5" /> Delete forever
                  </Button>
                </>
              )}
              <button
                onClick={() => setSelected(new Set())}
                aria-label="Clear selection"
                className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {q.isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary ring-1 ring-border">
              <LibraryIcon className="size-5 text-primary" />
            </div>
            <p className="text-sm font-medium">
              {tab === "trash" ? "Trash is empty." : "Nothing here yet."}
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {tab === "trash"
                ? "Deleted items land here and can be restored anytime."
                : "Head to the Workbench and hit Generate — every asset is autosaved."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <LibraryCard
                key={item.id}
                item={item}
                delay={i * 40}
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                inCollection={activeCollection}
                onFavorite={() =>
                  updateMut.mutate({ id: item.id, patch: { favorite: !item.favorite } })
                }
                onPin={() =>
                  updateMut.mutate({ id: item.id, patch: { pinned: !item.pinned } })
                }
                onArchive={() =>
                  updateMut.mutate({ id: item.id, patch: { archived: !item.archived } })
                }
                onTrash={() => trashMut.mutate([item.id])}
                onRestore={() => restoreMut.mutate([item.id])}
                onPurge={() => {
                  if (window.confirm("Permanently delete this item?"))
                    purgeMut.mutate([item.id]);
                }}
                onRemoveFromCollection={() => removeFromCollectionMut.mutate(item.id)}
                isTrashed={tab === "trash"}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={newCollectionOpen} onOpenChange={setNewCollectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              autoFocus
              placeholder="e.g. Q1 launch hooks"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCollectionName.trim()) {
                  createCollectionMut.mutate(newCollectionName.trim());
                }
              }}
              maxLength={80}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewCollectionOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newCollectionName.trim() || createCollectionMut.isPending}
              onClick={() => createCollectionMut.mutate(newCollectionName.trim())}
            >
              {createCollectionMut.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {selectedCount} item(s) to a collection</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto py-2">
            {collections.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No collections yet. Close this and create one first.
              </p>
            ) : (
              collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addToCollectionMut.mutate(c.id)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-card/60"
                >
                  <span className="flex items-center gap-2">
                    <Folder className="size-3.5 text-primary" /> {c.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {c.asset_count}
                  </span>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function LibraryCard({
  item,
  delay,
  selected,
  onToggleSelect,
  inCollection,
  onFavorite,
  onPin,
  onArchive,
  onTrash,
  onRestore,
  onPurge,
  onRemoveFromCollection,
  isTrashed,
}: {
  item: AssetRow;
  delay: number;
  selected: boolean;
  onToggleSelect: () => void;
  inCollection: string | null;
  onFavorite: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPurge: () => void;
  onRemoveFromCollection: () => void;
  isTrashed: boolean;
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
      className={cn(
        "group relative animate-fade-up rounded-2xl border border-border bg-card/40 p-4 backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-card/60",
        selected && "border-primary/70 bg-primary/[0.06] ring-1 ring-primary/40",
        item.pinned && !isTrashed && "border-primary/40",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <label
        className={cn(
          "absolute left-2 top-2 z-10 flex size-5 cursor-pointer items-center justify-center rounded border border-border bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100",
          selected && "border-primary bg-primary text-primary-foreground opacity-100",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={selected}
          onChange={onToggleSelect}
          aria-label="Select asset"
        />
        {selected && <Check className="size-3" />}
      </label>

      <div className="mb-3 flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 pl-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em]", meta.tint)}>
          <Icon className="size-3" /> {meta.label}
          {item.pinned && <Pin className="size-3 text-primary" />}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{date}</span>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
      {item.tags && item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded bg-secondary/60 px-1.5 py-0.5 text-[9px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="truncate text-[11px] text-muted-foreground">{topic}</span>
        <div className="flex shrink-0 items-center gap-1">
          {isTrashed ? (
            <>
              <IconBtn onClick={onRestore} label="Restore">
                <RotateCcw className="size-3.5" />
              </IconBtn>
              <IconBtn onClick={onPurge} label="Delete forever">
                <Trash2 className="size-3.5 hover:text-destructive" />
              </IconBtn>
            </>
          ) : (
            <>
              <IconBtn onClick={onFavorite} label={item.favorite ? "Unfavorite" : "Favorite"}>
                {item.favorite ? <Star className="size-3.5 text-primary" /> : <StarOff className="size-3.5" />}
              </IconBtn>
              <IconBtn onClick={onPin} label={item.pinned ? "Unpin" : "Pin"}>
                {item.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              </IconBtn>
              <IconBtn onClick={copy} label="Copy">
                {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              </IconBtn>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="More"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Plus className="size-3.5 rotate-45" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Export
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => download("txt")}>
                    <Download className="mr-2 size-3.5" /> Download .txt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => download("md")}>
                    <Download className="mr-2 size-3.5" /> Download .md
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {inCollection && (
                    <DropdownMenuItem onClick={onRemoveFromCollection}>
                      <X className="mr-2 size-3.5" /> Remove from collection
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onArchive}>
                    {item.archived ? (
                      <><ArchiveRestore className="mr-2 size-3.5" /> Unarchive</>
                    ) : (
                      <><Archive className="mr-2 size-3.5" /> Archive</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onTrash}
                  >
                    <Trash2 className="mr-2 size-3.5" /> Move to trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
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
