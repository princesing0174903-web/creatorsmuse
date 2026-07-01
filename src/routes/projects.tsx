import { createFileRoute } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Copy,
  Pencil,
  Sparkles,
  Clapperboard,
  Workflow,
  Megaphone,
  Star,
  Archive,
  ArchiveRestore,
  RotateCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listMyProjects,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
} from "@/lib/projects.functions";

export const Route = createFileRoute("/projects")({
  beforeLoad: requireAuthBeforeLoad,
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects — Creator’s Muse" },
      { name: "description", content: "Manage your creator projects." },
    ],
  }),
});

type ProjectType = "general" | "reel" | "workflow" | "campaign";
type Status = "draft" | "active" | "paused" | "completed" | "archived";
type Priority = "low" | "medium" | "high" | "urgent";
type Platform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "x"
  | "linkedin"
  | "multi"
  | "other";

interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  status: Status;
  priority: Priority;
  platform: Platform;
  category: string | null;
  color: string;
  icon: string | null;
  tags: string[];
  thumbnail_url: string | null;
  progress: number;
  estimated_completion: string | null;
  favorite: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

const COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-purple-500",
];

const TYPE_META: Record<
  ProjectType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  general: { label: "General", icon: FolderOpen },
  reel: { label: "Reel", icon: Clapperboard },
  workflow: { label: "Workflow", icon: Workflow },
  campaign: { label: "Campaign", icon: Megaphone },
};

const STATUS_OPTIONS: { id: Status; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS: { id: Priority; label: string; className: string }[] = [
  { id: "low", label: "Low", className: "text-emerald-400 border-emerald-500/30" },
  { id: "medium", label: "Medium", className: "text-sky-400 border-sky-500/30" },
  { id: "high", label: "High", className: "text-amber-400 border-amber-500/30" },
  { id: "urgent", label: "Urgent", className: "text-rose-400 border-rose-500/30" },
];

const PLATFORM_OPTIONS: { id: Platform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "multi", label: "Multi" },
  { id: "other", label: "Other" },
];

const TAB_FILTERS: {
  id: "all" | "favorites" | "archived" | ProjectType;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "reel", label: "Reels" },
  { id: "workflow", label: "Workflows" },
  { id: "campaign", label: "Campaigns" },
  { id: "favorites", label: "Favorites" },
  { id: "archived", label: "Archived" },
];

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TAB_FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"any" | Platform>("any");
  const [priorityFilter, setPriorityFilter] = useState<"any" | Priority>("any");
  const [statusFilter, setStatusFilter] = useState<"any" | Status>("any");
  const [sort, setSort] = useState<
    | "updated_desc"
    | "created_desc"
    | "name_asc"
    | "progress_desc"
  >("updated_desc");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  const debouncedQuery = useDebounced(query, 220);

  const listFn = useServerFn(listMyProjects);
  const createFn = useServerFn(createProject);
  const updateFn = useServerFn(updateProject);
  const deleteFn = useServerFn(deleteProject);
  const duplicateFn = useServerFn(duplicateProject);

  const params = useMemo(() => {
    const archived: "active" | "archived" | "all" =
      tab === "archived" ? "archived" : "active";
    const type = tab === "reel" || tab === "workflow" || tab === "campaign" ? tab : "any";
    return {
      search: debouncedQuery,
      archived,
      type,
      status: statusFilter,
      platform: platformFilter,
      priority: priorityFilter,
      favoritesOnly: tab === "favorites",
      sort,
      limit: 60,
      offset: 0,
    } as const;
  }, [tab, debouncedQuery, statusFilter, platformFilter, priorityFilter, sort]);

  const q = useQuery({
    queryKey: ["projects", params],
    queryFn: () => listFn({ data: params }),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (q.data) setProjects(q.data.rows as unknown as Project[]);
  }, [q.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["projects"] });

  const createMut = useMutation({
    mutationFn: (payload: ProjectPayload) => createFn({ data: payload }),
    onSuccess: () => {
      toast.success("Project created");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create project"),
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; patch: Partial<ProjectPayload> }) =>
      updateFn({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["projects"] });
      setProjects((prev) =>
        prev.map((p) => (p.id === v.id ? ({ ...p, ...v.patch } as Project) : p)),
      );
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => {
      toast.error(e.message || "Failed to save");
      invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Project deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => duplicateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Project duplicated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to duplicate"),
  });

  const handleSubmit = (values: ProjectPayload) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, patch: values });
    } else {
      createMut.mutate(values);
    }
    setOpen(false);
  };

  const hasAnyEver = (q.data?.total ?? 0) > 0 || projects.length > 0;

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 backdrop-blur md:px-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Projects
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => q.refetch()}
            aria-label="Refresh"
          >
            <RotateCw className={cn("size-4", q.isFetching && "animate-spin")} />
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="h-10 gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-95"
          >
            <Plus className="size-4" />
            New Project
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, description, category…"
              className="h-10 pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card/40 p-1">
            {TAB_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setTab(f.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === f.id
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <FilterBar
          status={statusFilter}
          onStatus={setStatusFilter}
          platform={platformFilter}
          onPlatform={setPlatformFilter}
          priority={priorityFilter}
          onPriority={setPriorityFilter}
          sort={sort}
          onSort={setSort}
        />

        {q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : q.isPending ? (
          <SkeletonGrid />
        ) : projects.length === 0 ? (
          <EmptyState
            hasAny={hasAnyEver}
            tab={tab}
            onCreate={() => {
              setEditing(null);
              setOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => {
                  setEditing(p);
                  setOpen(true);
                }}
                onDelete={() => setConfirmDelete(p)}
                onDuplicate={() => duplicateMut.mutate(p.id)}
                onToggleFavorite={() =>
                  updateMut.mutate({ id: p.id, patch: { favorite: !p.favorite } })
                }
                onArchiveToggle={() =>
                  updateMut.mutate({
                    id: p.id,
                    patch: {
                      archived: !p.archived,
                      status: !p.archived ? "archived" : "active",
                    },
                  })
                }
                onProgressChange={(v) =>
                  updateMut.mutate({ id: p.id, patch: { progress: v } })
                }
              />
            ))}
          </div>
        )}
      </div>

      <ProjectDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        submitting={createMut.isPending || updateMut.isPending}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{confirmDelete?.name}”. Generations and
              library assets stay in your account, unlinked from this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => {
                if (confirmDelete) deleteMut.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

type ProjectPayload = {
  name: string;
  description?: string | null;
  type: ProjectType;
  status: Status;
  priority: Priority;
  platform: Platform;
  category?: string | null;
  color: string;
  tags: string[];
  progress: number;
  estimated_completion?: string | null;
  favorite: boolean;
  archived?: boolean;
  thumbnail_url?: string | null;
};

function FilterBar({
  status,
  onStatus,
  platform,
  onPlatform,
  priority,
  onPriority,
  sort,
  onSort,
}: {
  status: "any" | Status;
  onStatus: (s: "any" | Status) => void;
  platform: "any" | Platform;
  onPlatform: (p: "any" | Platform) => void;
  priority: "any" | Priority;
  onPriority: (p: "any" | Priority) => void;
  sort: string;
  onSort: (s: "updated_desc" | "created_desc" | "name_asc" | "progress_desc") => void;
}) {
  const selectCls =
    "h-9 rounded-md border border-border bg-card/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40";
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value as "any" | Status)}
        className={selectCls}
      >
        <option value="any">Status: Any</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            Status: {o.label}
          </option>
        ))}
      </select>
      <select
        value={platform}
        onChange={(e) => onPlatform(e.target.value as "any" | Platform)}
        className={selectCls}
      >
        <option value="any">Platform: Any</option>
        {PLATFORM_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            Platform: {o.label}
          </option>
        ))}
      </select>
      <select
        value={priority}
        onChange={(e) => onPriority(e.target.value as "any" | Priority)}
        className={selectCls}
      >
        <option value="any">Priority: Any</option>
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            Priority: {o.label}
          </option>
        ))}
      </select>
      <div className="ml-auto">
        <select
          value={sort}
          onChange={(e) =>
            onSort(
              e.target.value as
                | "updated_desc"
                | "created_desc"
                | "name_asc"
                | "progress_desc",
            )
          }
          className={selectCls}
        >
          <option value="updated_desc">Recently edited</option>
          <option value="created_desc">Newest</option>
          <option value="name_asc">Name A→Z</option>
          <option value="progress_desc">Most progress</option>
        </select>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card/40"
        >
          <div className="h-28 animate-pulse bg-secondary/40" />
          <div className="space-y-3 p-4">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-secondary/50" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-secondary/40" />
            <div className="h-1.5 w-full animate-pulse rounded bg-secondary/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-500/40 bg-rose-500/5 px-6 py-16 text-center">
      <AlertTriangle className="mb-4 size-7 text-rose-400" />
      <h2 className="text-lg font-semibold">Couldn’t load your projects</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
      <Button onClick={onRetry} className="mt-5 gap-2">
        <RotateCw className="size-4" /> Retry
      </Button>
    </div>
  );
}

function EmptyState({
  hasAny,
  tab,
  onCreate,
}: {
  hasAny: boolean;
  tab: string;
  onCreate: () => void;
}) {
  const isArchived = tab === "archived";
  const isFav = tab === "favorites";
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-fuchsia-500/30">
        {isFav ? (
          <Star className="size-7 text-fuchsia-400" />
        ) : isArchived ? (
          <Archive className="size-7 text-fuchsia-400" />
        ) : (
          <FolderOpen className="size-7 text-fuchsia-400" />
        )}
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        {isFav
          ? "No favorites yet"
          : isArchived
            ? "Nothing archived"
            : hasAny
              ? "No projects match your filters"
              : "Your creative workspace is empty"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {isFav
          ? "Star a project from its menu to keep it here."
          : isArchived
            ? "Archived projects will appear in this tab."
            : hasAny
              ? "Try a different keyword, or clear filters to see everything."
              : "Start a new project to organize your reels, workflows, captions, and assets in one place."}
      </p>
      {!isArchived && !isFav && (
        <Button
          onClick={onCreate}
          className="mt-6 h-11 gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-95"
        >
          <Sparkles className="size-4" />
          {hasAny ? "Create Project" : "Create First Project"}
        </Button>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onArchiveToggle,
  onProgressChange,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
  onArchiveToggle: () => void;
  onProgressChange: (v: number) => void;
}) {
  const meta = TYPE_META[project.type] ?? TYPE_META.general;
  const Icon = meta.icon;
  const priorityMeta =
    PRIORITY_OPTIONS.find((p) => p.id === project.priority) ?? PRIORITY_OPTIONS[1];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card/40 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-fuchsia-500/40 hover:shadow-lg hover:shadow-fuchsia-500/10">
      <div className={cn("relative h-28 bg-gradient-to-br", project.color)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
        {project.thumbnail_url && (
          <img
            src={project.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            loading="lazy"
          />
        )}
        <Icon className="absolute right-4 top-4 size-6 text-white/80" />
        <button
          onClick={onToggleFavorite}
          aria-label={project.favorite ? "Unfavorite" : "Favorite"}
          className="absolute left-3 top-3 rounded-md bg-black/25 p-1.5 text-white/90 backdrop-blur transition-colors hover:bg-black/40"
        >
          <Star
            className={cn(
              "size-4",
              project.favorite ? "fill-yellow-300 text-yellow-300" : "text-white",
            )}
          />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{project.name}</h3>
            {project.description && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                {project.description}
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-muted-foreground/80">
              Edited {new Date(project.updated_at).toLocaleDateString()}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Project actions"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 size-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 size-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite}>
                <Star className="mr-2 size-3.5" />
                {project.favorite ? "Remove favorite" : "Favorite"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchiveToggle}>
                {project.archived ? (
                  <>
                    <ArchiveRestore className="mr-2 size-3.5" /> Restore
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 size-3.5" /> Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            {meta.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[10px] uppercase tracking-wider", priorityMeta.className)}
          >
            {priorityMeta.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">
            {project.status}
          </Badge>
          {project.platform && project.platform !== "multi" && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {project.platform}
            </Badge>
          )}
          {project.tags?.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={project.progress}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary/60 accent-fuchsia-500"
            aria-label="Project progress"
          />
        </div>

        {project.estimated_completion && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Target ·{" "}
            {new Date(project.estimated_completion).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function ProjectDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Project | null;
  onSubmit: (values: ProjectPayload) => void;
  submitting?: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("reel");
  const [status, setStatus] = useState<Status>("active");
  const [priority, setPriority] = useState<Priority>("medium");
  const [platform, setPlatform] = useState<Platform>("multi");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [tags, setTags] = useState("");
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setType((initial?.type as ProjectType) ?? "reel");
      setStatus(initial?.status ?? "active");
      setPriority(initial?.priority ?? "medium");
      setPlatform(initial?.platform ?? "multi");
      setCategory(initial?.category ?? "");
      setColor(initial?.color ?? COLORS[0]);
      setTags((initial?.tags ?? []).join(", "));
      setProgress(initial?.progress ?? 0);
      setEta(initial?.estimated_completion ?? "");
    }
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) return;
    const parsedTags = tags
      .split(/[,\n]/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 20);
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      type,
      status,
      priority,
      platform,
      category: category.trim() || null,
      color,
      tags: parsedTags,
      progress,
      estimated_completion: eta || null,
      favorite: initial?.favorite ?? false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring launch campaign"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(TYPE_META) as ProjectType[]).map((k) => {
                const M = TYPE_META[k];
                const Icon = M.icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setType(k)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                      type === k
                        ? "border-fuchsia-500/60 bg-fuchsia-500/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {M.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as Status)}
              options={STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
            <SelectField
              label="Priority"
              value={priority}
              onChange={(v) => setPriority(v as Priority)}
              options={PRIORITY_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
            <SelectField
              label="Platform"
              value={platform}
              onChange={(v) => setPlatform(v as Platform)}
              options={PLATFORM_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Category
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Fitness, Fashion…"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Tags <span className="text-muted-foreground/70">(comma separated)</span>
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="viral, hook, launch"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Progress · {progress}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary/60 accent-fuchsia-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Target completion
              </label>
              <Input
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-8 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-background transition-all",
                    c,
                    color === c ? "ring-2 ring-fuchsia-400" : "opacity-80 hover:opacity-100",
                  )}
                  aria-label="Pick color"
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!name.trim() || !!submitting}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-95"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : initial ? (
              "Save changes"
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-card/40 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}