import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuthBeforeLoad } from "@/lib/route-auth";
import { useState } from "react";
import { User, LogOut, Palette, CreditCard, Sparkles, Check, Bell, Mail, Brain } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BrandBrainPanel } from "@/components/brand-brain";
import { useAuth, signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuthBeforeLoad,
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Creator’s Muse" },
      { name: "description", content: "Manage your profile, preferences, and subscription." },
    ],
  }),
});

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"dark" | "system">("dark");
  const [emailDigest, setEmailDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);

  const logout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/70 px-8 backdrop-blur">
        <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
          Settings / Account
        </h1>
      </header>

      <div className="mx-auto w-full max-w-3xl animate-fade-up space-y-8 p-6 md:p-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Settings.</h2>
          <p className="text-sm text-muted-foreground">Tune your account, workspace, and synthesis defaults.</p>
        </div>

        {/* Profile */}
        <Section icon={User} label="Profile">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-gradient-primary text-base font-bold text-primary-foreground">
              {(user?.name ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name ?? "Creator"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? "—"}</p>
            </div>
            <button
              onClick={() => toast.message("Profile editing coming soon.")}
              className="rounded-md border border-border bg-card/40 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Edit
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Display name" value={user?.name ?? "—"} />
            <Field label="Email" value={user?.email ?? "—"} />
          </div>

          <button
            onClick={logout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-card/60 sm:w-auto"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </Section>

        {/* Theme & preferences */}
        <Section icon={Palette} label="Appearance & Preferences">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {(["dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                      theme === t
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border bg-card/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="capitalize">{t}</span>
                    {theme === t && <Check className="size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <Toggle
              icon={Mail}
              label="Weekly email digest"
              description="A Monday recap of what's been generated."
              value={emailDigest}
              onChange={setEmailDigest}
            />
            <Toggle
              icon={Bell}
              label="Product updates"
              description="New features, model upgrades, and changelogs."
              value={productUpdates}
              onChange={setProductUpdates}
            />
          </div>
        </Section>

        {/* Subscription */}
        <Section icon={CreditCard} label="Subscription">
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-card/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                  Current plan
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">Free</p>
                <p className="mt-1 text-xs text-muted-foreground">5 syntheses / day · standard models</p>
              </div>
              <Sparkles className="size-5 text-primary" />
            </div>

            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-3 text-primary" /> Unlimited library archive
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3 text-primary" /> Unlock GPT-5 & priority synthesis
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3 text-primary" /> 4K shorts angles + voice export
              </li>
            </ul>

            <button
              onClick={() => toast.message("Billing is not connected yet.")}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              Upgrade to Pro
            </button>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/30 p-5 backdrop-blur-xl md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-3.5 text-primary" />
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm">{value}</p>
    </div>
  );
}

function Toggle({
  icon: Icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card/30 p-3 text-left transition-colors hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          value ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-background shadow transition-transform",
            value ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}