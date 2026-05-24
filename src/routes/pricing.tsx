import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Zap, Crown, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PLANS, setPlan, usePlan, type PlanId } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Nexus" },
      { name: "description", content: "Free, Pro, and Creator plans for AI-powered viral content generation." },
    ],
  }),
});

const ICONS: Record<PlanId, typeof Sparkles> = {
  free: Sparkles,
  pro: Zap,
  creator: Crown,
};

function PricingPage() {
  const [yearly, setYearly] = useState(true);
  const { planId } = usePlan();

  const choose = async (id: PlanId) => {
    if (id !== "free") {
      toast.message("Checkout coming soon", {
        description: "Paid plans unlock at public launch. Join the waitlist below.",
      });
      return;
    }
    try {
      await setPlan(id);
      toast.success("Switched to Free plan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan.");
    }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-8">
        <h1 className="ml-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:ml-0">
          Pricing / Choose your plan
        </h1>
      </header>

      <div className="mx-auto w-full max-w-6xl animate-fade-up space-y-10 p-6 md:p-10">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            <Sparkles className="size-3" /> Plans built for creators
          </div>
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Ship viral content, <span className="text-primary">at AI speed.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Start free. Scale when your content does. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mx-auto mt-6 inline-flex items-center gap-1 rounded-full border border-border bg-card/40 p-1 font-mono text-[10px] uppercase tracking-widest">
            <button
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                !yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
                yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yearly
              <span className={cn(
                "rounded px-1 py-0.5 text-[8px]",
                yearly ? "bg-primary-foreground/20" : "bg-primary/15 text-primary",
              )}>
                −20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = ICONS[plan.id];
            const active = planId === plan.id;
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            return (
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
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg ring-1",
                      plan.highlight ? "bg-primary/15 ring-primary/40" : "bg-secondary ring-border",
                    )}
                  >
                    <Icon className={cn("size-4", plan.highlight ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">${price}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="mb-5 text-[11px] text-muted-foreground">
                  {plan.id === "free"
                    ? "Forever free"
                    : yearly
                      ? `Billed yearly · $${price * 12}/yr`
                      : "Billed monthly"}
                </p>
                <ul className="mb-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          plan.highlight ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choose(plan.id)}
                  disabled={active}
                  className={cn(
                    "h-11 rounded-lg font-semibold text-sm uppercase tracking-wider transition-transform",
                    "inline-flex items-center justify-center gap-2",
                    active
                      ? "cursor-default border border-border bg-secondary/60 text-muted-foreground"
                      : plan.highlight
                        ? "bg-primary text-primary-foreground shadow-glow hover:scale-[1.02]"
                        : "border border-primary/40 text-primary hover:bg-primary/10",
                  )}
                >
                  {active ? (
                    "Current plan"
                  ) : plan.id === "free" ? (
                    "Switch to Free"
                  ) : (
                    <>
                      <Lock className="size-3.5" /> Coming soon
                    </>
                  )}
                </button>
                {!active && plan.id !== "free" && (
                  <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                    Billing launches publicly soon
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pro & Creator unlock at public launch with secure Stripe checkout. Until then, every account runs on the Free plan.{" "}
          <Link to="/settings" className="text-primary hover:underline">Manage account →</Link>
        </p>
      </div>
    </AppShell>
  );
}