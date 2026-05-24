import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
<<<<<<< HEAD
import { useState } from "react";
=======
import { useEffect, useState } from "react";
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
import {
  LayoutDashboard,
  FolderOpen,
  Library,
  Settings,
  LogOut,
  Menu,
  X,
<<<<<<< HEAD
} from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
=======
  Clapperboard,
  Workflow,
  Sparkles,
} from "lucide-react";
import { AuthScreen } from "@/components/auth-screen";
import { useAuth, signOut } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" as const },
<<<<<<< HEAD
  { label: "Projects", icon: FolderOpen, to: "/projects" as const },
  { label: "Library", icon: Library, to: "/library" as const },
=======
  { label: "Reel Generator", icon: Clapperboard, to: "/reels" as const },
  { label: "Workflow", icon: Workflow, to: "/workflow" as const },
  { label: "Projects", icon: FolderOpen, to: "/projects" as const },
  { label: "Library", icon: Library, to: "/library" as const },
  { label: "Pricing", icon: Sparkles, to: "/pricing" as const },
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  { label: "Settings", icon: Settings, to: "/settings" as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
<<<<<<< HEAD
  const { user, loading } = useAuth();
=======
  const { user, ready } = useAuth();
  const { plan, used, percent } = usePlan();
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

<<<<<<< HEAD
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="size-6 animate-pulse rounded bg-primary/70 shadow-glow" />
      </div>
    );
=======
  // Route `beforeLoad` already verified session; only handle rare expiry after mount.
  useEffect(() => {
    if (ready && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [ready, user, navigate]);

  // Route guard already validated session; only block UI when we have no user yet.
  if (!user && !ready) {
    return <AuthScreen message="Loading your workspace…" />;
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  }
  if (!user) return null;

  const logout = async () => {
    await signOut();
<<<<<<< HEAD
    navigate({ to: "/login" });
=======
    navigate({ to: "/login", replace: true });
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed left-4 top-4 z-50 flex size-9 items-center justify-center rounded-lg border border-border bg-background/80 backdrop-blur md:hidden"
        aria-label="Toggle menu"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-sidebar/90 backdrop-blur-md transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link to="/" className="flex items-center gap-3 p-6">
          <div className="size-6 rounded bg-primary shadow-glow" />
          <span className="text-lg font-bold uppercase tracking-tighter">Nexus</span>
        </Link>

        <nav className="flex-1 space-y-1 px-4">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <n.icon className="size-4" />
                <span className="font-medium">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
<<<<<<< HEAD
=======
          <Link
            to="/pricing"
            className="mb-3 block rounded-lg border border-border bg-background/40 p-3 transition-colors hover:border-primary/30"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {plan.name} plan
              </span>
              <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                {used}/{plan.monthlyCredits}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            {plan.id === "free" && (
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                Upgrade →
              </p>
            )}
          </Link>
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
          <div className="flex items-center gap-3 rounded-lg bg-background/40 p-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
              {(user?.name ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium">{user?.name ?? "Creator"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.email ?? "—"}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto bg-gradient-radial">
        {children}
      </main>
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/70 px-8 backdrop-blur">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h1>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-border bg-card/40 ring-1 ring-primary/10">
          <Icon className="size-7 text-primary" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Coming Soon
        </div>
      </div>
    </AppShell>
  );
}