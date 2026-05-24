import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Zap, Video, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Nexus — AI content engine for creators" },
      {
        name: "description",
        content:
          "Synthesize raw video into viral hooks, captions, tweets, and shorts ideas. The AI workbench built for modern creators.",
      },
    ],
  }),
});

function Landing() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-md bg-primary shadow-glow animate-pulse-glow" />
          <span className="text-lg font-bold uppercase tracking-tighter">Nexus</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link
            to={user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            Launch app <ArrowRight className="size-3.5" />
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-32 text-center">
        <div
          className={`mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur ${mounted ? "animate-fade-up" : "opacity-0"}`}
        >
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          AI Engine v3.1 — Online
        </div>

        <h1
          className={`text-balance text-6xl font-bold tracking-tighter md:text-7xl ${mounted ? "animate-fade-up" : "opacity-0"}`}
          style={{ animationDelay: "80ms" }}
        >
          Turn raw footage into{" "}
          <span className="relative inline-block">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-[-8%] inset-y-[-10%] -z-10 rounded-[2rem] opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(60% 70% at 50% 50%, oklch(0.82 0.14 200 / 18%), transparent 70%)",
              }}
            />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(1 0 0) 0%, oklch(0.98 0 0) 50%, oklch(0.95 0 0) 100%)",
              }}
            >
              viral output.
            </span>
          </span>
        </h1>
        <p
          className={`mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground ${mounted ? "animate-fade-up" : "opacity-0"}`}
          style={{ animationDelay: "160ms" }}
        >
          Upload a clip, drop a topic, and synthesize hooks, captions, threads, and shorts angles in seconds.
        </p>

        <div
          className={`mt-10 flex items-center justify-center gap-3 ${mounted ? "animate-fade-up" : "opacity-0"}`}
          style={{ animationDelay: "240ms" }}
        >
          <Link
            to={user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-95"
          >
            Start generating <ArrowRight className="size-4" />
          </Link>
          <a
            href="#features"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            See how it works
          </a>
        </div>

        <div
          id="features"
          className={`mt-28 grid grid-cols-1 gap-4 text-left md:grid-cols-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}
          style={{ animationDelay: "320ms" }}
        >
          {[
            { icon: Video, label: "Drop video", desc: "MP4, MOV, raw clips" },
            { icon: Zap, label: "Add topic", desc: "Context in one line" },
            { icon: Sparkles, label: "Synthesize", desc: "4 asset types instantly" },
            { icon: MessageSquare, label: "Ship it", desc: "Copy & post anywhere" },
          ].map((f, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-border bg-card/50 p-5 transition-all hover:border-primary/30 hover:bg-card"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                <f.icon className="size-4" />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Step 0{i + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
