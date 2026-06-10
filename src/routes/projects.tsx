import { createFileRoute } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useEffect, useMemo, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

type ProjectKind = "reels" | "workflows" | "campaigns";

interface Project {
  id: string;
  name: string;
  description?: string;
  kind: ProjectKind;
  color: string;
  createdAt: number;
  assetCount: number;
}

const STORAGE_KEY = "cm.projects.v1";

const COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-purple-500",
];

const KIND_META: Record<ProjectKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  reels: { label: "Reel", icon: Clapperboard },
  workflows: { label: "Workflow", icon: Workflow },
  campaigns: { label: "Campaign", icon: Megaphone },
};

const FILTERS: { id: "all" | ProjectKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reels", label: "Reels" },
  { id: "workflows", label: "Workflows" },
  { id: "campaigns", label: "Campaigns" },
];

function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function saveProjects(p: Project[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<"all" | ProjectKind>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const persist = (next: Project[]) => {
    setProjects(next);
    saveProjects(next);
  };

  const filtered = useMemo(() => {
    return projects
      .filter((p) => (filter === "all" ? true : p.kind === filter))
      .filter((p) =>
        query.trim() ? p.name.toLowerCase().includes(query.toLowerCase()) : true,
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [projects, filter, query]);

  const handleCreate = (p: Omit<Project, "id" | "createdAt" | "assetCount">) => {
    const next: Project = {
      ...p,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      assetCount: 0,
    };
    persist([next, ...projects]);
  };

  const handleUpdate = (id: string, patch: Partial<Project>) => {
    persist(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleDelete = (id: string) => {
    persist(projects.filter((p) => p.id !== id));
  };

  const handleDuplicate = (p: Project) => {
    const copy: Project = {
      ...p,
      id: crypto.randomUUID(),
      name: `${p.name} (copy)`,
      createdAt: Date.now(),
    };
    persist([copy, ...projects]);
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 backdrop-blur md:px-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Projects
        </h1>
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
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="h-10 pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card/40 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f.id
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            hasAny={projects.length > 0}
            onCreate={() => {
              setEditing(null);
              setOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => {
                  setEditing(p);
                  setOpen(true);
                }}
                onDelete={() => handleDelete(p.id)}
                onDuplicate={() => handleDuplicate(p)}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={(values) => {
          if (editing) {
            handleUpdate(editing.id, values);
          } else {
            handleCreate(values);
          }
          setOpen(false);
        }}
      />
    </AppShell>
  );
}

function EmptyState({ hasAny, onCreate }: { hasAny: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-fuchsia-500/30">
        <FolderOpen className="size-7 text-fuchsia-400" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        {hasAny ? "No projects match your search" : "Your creative workspace is empty"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {hasAny
          ? "Try a different keyword or clear the filters."
          : "Start a new project to organize your reels, workflows, and assets in one place."}
      </p>
      <Button
        onClick={onCreate}
        className="mt-6 h-11 gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-95"
      >
        <Sparkles className="size-4" />
        {hasAny ? "Create Project" : "Create First Project"}
      </Button>
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const meta = KIND_META[project.kind];
  const Icon = meta.icon;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card/40 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-fuchsia-500/40 hover:shadow-lg hover:shadow-fuchsia-500/10">
      <div className={cn("relative h-28 bg-gradient-to-br", project.color)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
        <Icon className="absolute right-4 top-4 size-6 text-white/80" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{project.name}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {new Date(project.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 size-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 size-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            {meta.label}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {project.assetCount} {project.assetCount === 1 ? "asset" : "assets"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Project | null;
  onSubmit: (values: { name: string; description?: string; kind: ProjectKind; color: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ProjectKind>("reels");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setKind(initial?.kind ?? "reels");
      setColor(initial?.color ?? COLORS[0]);
    }
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() || undefined, kind, color });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(KIND_META) as ProjectKind[]).map((k) => {
                const M = KIND_META[k];
                const Icon = M.icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                      kind === k
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
            disabled={!name.trim()}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-95"
          >
            {initial ? "Save changes" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}