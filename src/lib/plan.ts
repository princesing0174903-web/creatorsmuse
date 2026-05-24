import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyPlanUsage, setMyPlan } from "./plan.functions";

export type PlanId = "free" | "pro" | "creator";

export type Plan = {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
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

type Snapshot = { plan: PlanId; used: number; limit: number };

// Module-level cache so multiple consumers share a single server fetch.
let cache: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function fetchSnapshot(): Promise<Snapshot> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const snap = (await getMyPlanUsage()) as Snapshot;
      cache = snap;
      emit();
      return snap;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Refresh the cached plan/usage snapshot from the server. Call after a
 * successful AI generation so the sidebar usage bar updates immediately.
 */
export function refreshUsage(): void {
  void fetchSnapshot().catch(() => {
    /* swallow — UI will retry on next mount */
  });
}

/**
 * Back-compat shim. The real source of truth lives server-side now;
 * this just triggers a refresh of the cached snapshot.
 */
export function incrementUsage(_n = 1): void {
  refreshUsage();
}

export function usePlan() {
  const [, setTick] = useState(0);
  const updatePlan = useServerFn(setMyPlan);

  useEffect(() => {
    const cb = () => setTick((t) => t + 1);
    listeners.add(cb);
    if (!cache && typeof window !== "undefined") {
      void fetchSnapshot().catch(() => {});
    }
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const snap = cache ?? { plan: "free" as PlanId, used: 0, limit: 25 };
  const plan = PLANS.find((p) => p.id === snap.plan) ?? PLANS[0];
  const remaining = Math.max(0, snap.limit - snap.used);
  const percent = Math.min(100, Math.round((snap.used / snap.limit) * 100));

  const setPlan = async (id: PlanId) => {
    const next = (await updatePlan({ data: { plan: id } })) as Snapshot;
    cache = next;
    emit();
  };

  return {
    plan,
    planId: snap.plan,
    used: snap.used,
    remaining,
    percent,
    isPaid: snap.plan !== "free",
    isCreator: snap.plan === "creator",
    setPlan,
  };
}

/**
 * Imperative plan switch for non-hook callers. Updates the server, then
 * refreshes the cached snapshot for all `usePlan` subscribers.
 */
export async function setPlan(id: PlanId): Promise<void> {
  const next = (await setMyPlan({ data: { plan: id } })) as Snapshot;
  cache = next;
  emit();
}
