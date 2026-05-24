import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
<<<<<<< HEAD
import { ArrowRight, Sparkles, Zap, Video, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
=======
import {
  ArrowRight,
  Sparkles,
  Zap,
  Video,
  MessageSquare,
  Brain,
  Workflow,
  Gauge,
  Hash,
  Repeat,
  Check,
  Crown,
  ChevronDown,
  Star,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { PLANS } from "@/lib/plan";
import { cn } from "@/lib/utils";
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
<<<<<<< HEAD
      { title: "Nexus — AI content engine for creators" },
      {
        name: "description",
        content:
          "Synthesize raw video into viral hooks, captions, tweets, and shorts ideas. The AI workbench built for modern creators.",
      },
=======
      { title: "Creator's Muse — The AI operating system for modern creators" },
      {
        name: "description",
        content:
          "Generate viral hooks, captions, reels, and shorts ideas — scored by AI before you post. The creator OS used by founders, marketers, and full-time creators.",
      },
      { property: "og:title", content: "Creator's Muse — The AI operating system for modern creators" },
      { property: "og:description", content: "Generate viral hooks, captions, reels, and shorts ideas — scored by AI before you post." },
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
    ],
  }),
});

function Landing() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
<<<<<<< HEAD
=======
  const appCta = user ? "/dashboard" : "/login";
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc

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

<<<<<<< HEAD
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
=======
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-md bg-primary shadow-glow animate-pulse-glow" />
          <span className="text-lg font-bold uppercase tracking-tighter">Creator's Muse</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">Features</a>
          <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
          <a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
          <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
        </nav>
        <Link
          to={appCta}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
        >
          Launch app <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16 text-center md:pt-24">
        <div
          className={cn(
            "mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur",
            mounted ? "animate-fade-up" : "opacity-0",
          )}
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
        >
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          AI Engine v3.1 — Online
        </div>

        <h1
<<<<<<< HEAD
          className={`text-balance text-6xl font-bold tracking-tighter md:text-7xl ${mounted ? "animate-fade-up" : "opacity-0"}`}
          style={{ animationDelay: "80ms" }}
        >
          Turn raw footage into{" "}
=======
          className={cn(
            "text-balance text-5xl font-bold tracking-tighter md:text-7xl",
            mounted ? "animate-fade-up" : "opacity-0",
          )}
          style={{ animationDelay: "80ms" }}
        >
          Create viral content{" "}
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
          <span className="relative inline-block">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-[-8%] inset-y-[-10%] -z-10 rounded-[2rem] opacity-70 blur-2xl"
              style={{
                background:
<<<<<<< HEAD
                  "radial-gradient(60% 70% at 50% 50%, oklch(0.82 0.14 200 / 18%), transparent 70%)",
=======
                  "radial-gradient(60% 70% at 50% 50%, oklch(0.82 0.14 200 / 22%), transparent 70%)",
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
              }}
            />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(1 0 0) 0%, oklch(0.98 0 0) 50%, oklch(0.95 0 0) 100%)",
              }}
            >
<<<<<<< HEAD
              viral output.
=======
              before trends peak.
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
            </span>
          </span>
        </h1>
        <p
<<<<<<< HEAD
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
=======
          className={cn(
            "mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl",
            mounted ? "animate-fade-up" : "opacity-0",
          )}
          style={{ animationDelay: "160ms" }}
        >
          The AI operating system for modern creators. Generate hooks, captions, reels, and shorts ideas — scored, ranked, and ready to post.
        </p>

        <div
          className={cn(
            "mt-10 flex flex-wrap items-center justify-center gap-3",
            mounted ? "animate-fade-up" : "opacity-0",
          )}
          style={{ animationDelay: "240ms" }}
        >
          <Link
            to={appCta}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-95"
          >
            Start generating free <ArrowRight className="size-4" />
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
          </Link>
          <a
            href="#features"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            See how it works
          </a>
        </div>

        <div
<<<<<<< HEAD
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
=======
          className={cn(
            "mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground",
            mounted ? "animate-fade-up" : "opacity-0",
          )}
          style={{ animationDelay: "320ms" }}
        >
          <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> 25 free generations</span>
          <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> No credit card</span>
          <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Cancel anytime</span>
        </div>

        {/* Dashboard preview mockup */}
        <div
          className={cn(
            "relative mx-auto mt-16 max-w-5xl",
            mounted ? "animate-fade-up" : "opacity-0",
          )}
          style={{ animationDelay: "400ms" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-10 -bottom-10 -top-6 -z-10 rounded-[3rem] blur-3xl"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 30%, oklch(0.82 0.14 200 / 18%), transparent 70%)",
            }}
          />
          <DashboardMockup />
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="relative z-10 border-y border-border/60 bg-card/20 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Trusted by independent creators, founders, and growth teams
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { metric: "10M+", label: "AI tokens generated" },
              { metric: "+47%", label: "Avg. engagement uplift" },
              { metric: "12k", label: "Creators onboarded" },
              { metric: "4.9★", label: "Average rating" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card/40 p-5 text-center"
              >
                <div className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {s.metric}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.author}
                className="rounded-2xl border border-border bg-card/40 p-5"
              >
                <div className="mb-2 flex gap-0.5 text-primary">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="size-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-foreground">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 text-xs">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ring-1 ring-primary/30">
                    {t.author[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t.author}</div>
                    <div className="text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            <Sparkles className="size-3" /> The creator OS
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Everything you need to ship,{" "}
            <span className="text-primary">in one engine.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Six AI systems working together — from idea capture to viral scoring. Built for creators who measure output in days, not weeks.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 border-t border-border/60 bg-card/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
              <Crown className="size-3" /> Pricing
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Start free.{" "}
              <span className="text-primary">Scale when you do.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Every plan includes the full AI engine. Pay only for the credits you actually use.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card/40 p-6 transition-all",
                  plan.highlight
                    ? "border-primary/60 shadow-glow ring-1 ring-primary/30 md:scale-[1.02]"
                    : "border-border hover:border-primary/30",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-primary-foreground shadow-glow">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">${plan.monthlyPrice}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {plan.monthlyCredits.toLocaleString()} AI generations / month
                </p>
                <ul className="my-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          plan.highlight ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                {plan.id === "free" ? (
                  <Link
                    to={appCta}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-lg font-semibold text-sm uppercase tracking-wider transition-transform",
                      "border border-primary/40 text-primary hover:bg-primary/10",
                    )}
                  >
                    Get started
                  </Link>
                ) : (
                  <button
                    disabled
                    className={cn(
                      "inline-flex h-11 items-center justify-center gap-2 rounded-lg font-semibold text-sm uppercase tracking-wider",
                      "cursor-not-allowed border border-border bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    <Lock className="size-3.5" /> Coming soon
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Paid plans unlock at public launch via secure Stripe checkout.{" "}
            <Link to="/pricing" className="text-primary hover:underline">View full pricing →</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Frequently asked
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Everything else you might want to know before signing up.
          </p>
        </div>
        <div className="mt-10 space-y-3">
          {FAQ.map((item, i) => (
            <FaqRow key={item.q} q={item.q} a={item.a} defaultOpen={i === 0} />
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/40 p-10 text-center md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, oklch(0.82 0.14 200 / 18%), transparent 70%)",
            }}
          />
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            <Sparkles className="size-3" /> Limited public beta
          </div>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight md:text-5xl">
            Ship your next viral post{" "}
            <span className="text-primary">in the next 5 minutes.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            Join thousands of creators using AI to ideate, score, and ship content faster than the algorithm can shift.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={appCta}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-95"
            >
              Start generating free <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/pricing"
              className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ----------------------------- subcomponents ---------------------------- */

function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-2xl backdrop-blur-sm md:p-5">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-destructive/70" />
        <span className="size-2.5 rounded-full bg-amber-500/70" />
        <span className="size-2.5 rounded-full bg-emerald-500/70" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          creatorsmuse.app / workbench
        </span>
      </div>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-5 space-y-3">
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Input</div>
            <div className="mt-2 text-sm">Productivity for remote founders</div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-primary p-3 text-primary-foreground shadow-glow">
            <Sparkles className="size-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Generate</span>
          </div>
        </div>
        <div className="col-span-7 space-y-3">
          {[
            { label: "Hook", score: 94, text: "The 4-hour rule that 10x'd my output" },
            { label: "Caption", score: 88, text: "Stop optimizing your morning. Start protecting your afternoon." },
            { label: "Short", score: 91, text: "Why I deleted Slack at 2pm every day" },
          ].map((r) => (
            <div key={r.label} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {r.label}
                </span>
                <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                  {r.score}
                </span>
              </div>
              <div className="mt-1.5 text-xs">{r.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaqRow({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold transition-colors hover:bg-card/60"
      >
        {q}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
          {a}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- data --------------------------------- */

const FEATURES = [
  {
    icon: Brain,
    title: "Viral Intelligence",
    desc: "Every asset is scored across 6 metrics — hook strength, retention, trend alignment, and more — before it leaves the engine.",
  },
  {
    icon: Video,
    title: "AI Reel Generator",
    desc: "Drop a long-form video or paste an idea. Get reel segments, viral hooks, captions, and engagement predictions in seconds.",
  },
  {
    icon: Workflow,
    title: "Workflow OS",
    desc: "Idea → Script → Reel → Post. Move content through a creator-grade Kanban board with persistent state across sessions.",
  },
  {
    icon: Gauge,
    title: "AI Scoring",
    desc: "Predict performance before you post. Each generated asset shows confidence, virality, and audience-retention forecasts.",
  },
  {
    icon: Hash,
    title: "Hook Optimization",
    desc: "Rewrite, score, and A/B the first 3 seconds — the only part of your video that matters for the algorithm.",
  },
  {
    icon: Repeat,
    title: "Content Repurposing",
    desc: "One input, every platform. Turn a single idea into hooks, captions, threads, and short-form scripts simultaneously.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I cut my content workflow from 6 hours to 40 minutes. The scoring system is genuinely scary-accurate.",
    author: "Maya Chen",
    role: "Full-time creator, 480k followers",
  },
  {
    quote: "We use Creator's Muse for every client. The reel generator alone replaced two contractors on our team.",
    author: "Devon Park",
    role: "Growth lead, indie agency",
  },
  {
    quote: "It's the first AI tool that actually understands creator-speak. My hooks went from forgettable to clickable overnight.",
    author: "Sofía Reyes",
    role: "Founder, B2B SaaS",
  },
];

const FAQ = [
  {
    q: "How is Creator's Muse different from ChatGPT?",
    a: "ChatGPT is a general-purpose assistant. Creator's Muse is purpose-built for short-form content: it scores virality, predicts retention, generates reel timestamps, and ships output formatted for the platforms you actually post to.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Creator's Muse runs entirely in your browser. Sign in, drop a clip or topic, and you're generating in under a minute.",
  },
  {
    q: "What counts as a generation?",
    a: "Each synthesis run — Workbench or Reel Generator — counts as one credit, regardless of how many assets are produced from that single input.",
  },
  {
    q: "Is my content used to train AI models?",
    a: "No. Your prompts are forwarded to model providers only to produce your output and are never used to train models. See our Privacy Policy for full details.",
  },
  {
    q: "When do paid plans launch?",
    a: "Pro and Creator plans unlock at public launch via secure Stripe checkout. Every account today runs on the Free plan with 25 monthly credits.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Plans are monthly with no contracts. Cancel from Settings and you'll keep access until the end of your billing period.",
  },
];
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
