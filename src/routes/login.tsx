import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { setUser, getUser } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Nexus" },
      { name: "description", content: "Sign in to your Nexus AI creator workbench." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const displayName = name || email.split("@")[0];
    setUser({ email, name: displayName });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <Link
        to="/"
        className="absolute left-6 top-6 z-10 flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <div className="size-6 rounded bg-primary shadow-glow" />
        <span className="font-bold uppercase tracking-tighter">Nexus</span>
      </Link>

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-elegant backdrop-blur-xl">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <div className="size-4 rounded-sm bg-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your creator workbench."
                : "Start synthesizing in under a minute."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-11 w-full rounded-lg border border-border bg-background/60 px-4 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@creator.ai"
              className="h-11 w-full rounded-lg border border-border bg-background/60 px-4 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-11 w-full rounded-lg border border-border bg-background/60 px-4 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={() => {
              setUser({ email: "demo@nexus.ai", name: "Alex Rivers" });
              navigate({ to: "/dashboard" });
            }}
            className="h-11 w-full rounded-lg border border-border bg-background/40 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Continue with demo account
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Encrypted · End-to-end · Edge-deployed
        </p>
      </div>
    </div>
  );
}