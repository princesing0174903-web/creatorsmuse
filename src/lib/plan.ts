import { useEffect, useState } from "react";

export type PlanId = "free" | "pro" | "creator";

export type Plan = {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number; // per month, billed yearly
  monthlyCredits: number;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCredits: 25,
    features: [
      "25 AI generations / month",
      "Hooks, captions, posts, shorts",
      "Basic viral scoring",
      "Single workspace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 19,
    yearlyPrice: 15,
    monthlyCredits: 500,
    features: [
      "500 AI generations / month",
      "Full Viral Intelligence (6 metrics)",
      "AI Reel Generator",
      "Workflow OS with persistence",
      "Priority AI engine",
    ],
    highlight: true,
  },
  {
    id: "creator",
    name: "Creator",
    monthlyPrice: 49,
    yearlyPrice: 39,
    monthlyCredits: 2500,
    features: [
      "2,500 AI generations / month",
      "Everything in Pro",
      "Trend & retention forecasting",
      "Bulk reel processing",
      "Custom brand voice (soon)",
      "Dedicated support",
    ],
  },
];

const STORAGE_KEY = "nexus.plan.v1";
const USAGE_KEY = "nexus.plan.usage.v1";

type Stored = { plan: PlanId };
type Usage = { month: string; used: number };

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
}

function readPlan(): PlanId {
  if (typeof window === "undefined") return "free";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return "free";
    const parsed = JSON.parse(raw) as Stored;
    return parsed.plan ?? "free";
  } catch {
    return "free";
  }
}

function readUsage(): Usage {
  if (typeof window === "undefined") return { month: currentMonth(), used: 0 };
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    if (!raw) return { month: currentMonth(), used: 0 };
    const parsed = JSON.parse(raw) as Usage;
    if (parsed.month !== currentMonth()) return { month: currentMonth(), used: 0 };
    return parsed;
  } catch {
    return { month: currentMonth(), used: 0 };
  }
}

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function setPlan(id: PlanId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan: id } satisfies Stored));
  emit();
}

export function incrementUsage(n = 1) {
  if (typeof window === "undefined") return;
  const u = readUsage();
  const next: Usage = { month: u.month, used: u.used + n };
  window.localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  emit();
}

export function usePlan() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((t) => t + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const planId = readPlan();
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const usage = readUsage();
  const remaining = Math.max(0, plan.monthlyCredits - usage.used);
  const percent = Math.min(100, Math.round((usage.used / plan.monthlyCredits) * 100));

  return {
    plan,
    planId,
    used: usage.used,
    remaining,
    percent,
    isPaid: planId !== "free",
    isCreator: planId === "creator",
  };
}