// Server-only quota + plan helpers. Do NOT import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PLAN_LIMITS = { free: 25, pro: 500, creator: 2500 } as const;
export type ServerPlanId = keyof typeof PLAN_LIMITS;

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
}

export async function getUserPlan(userId: string): Promise<ServerPlanId> {
  const { data } = await supabaseAdmin
    .from("user_plans")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const p = (data?.plan as ServerPlanId | undefined) ?? "free";
  return p in PLAN_LIMITS ? p : "free";
}

export async function setUserPlan(userId: string, plan: ServerPlanId): Promise<void> {
  if (!(plan in PLAN_LIMITS)) throw new Error("Invalid plan");
  // Defense-in-depth: paid tiers may only be assigned via a verified billing
  // webhook (Stripe checkout.session.completed). No client-callable surface
  // is allowed to elevate a user's plan without proof of payment.
  if (plan !== "free") {
    throw new Error(
      "setUserPlan: paid plans require a verified billing webhook; refusing to elevate without payment proof.",
    );
  }
  const { error } = await supabaseAdmin.from("user_plans").upsert({
    user_id: userId,
    plan,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to update plan: ${error.message}`);
}

export async function getUsageSnapshot(userId: string) {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan];
  const month = currentMonth();
  const { data } = await supabaseAdmin
    .from("usage_counters")
    .select("used")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  return { plan, used: data?.used ?? 0, limit };
}

/**
 * Atomically check + record an AI credit consumption. Throws if the user
 * has exceeded their plan limit. Caller MUST invoke this BEFORE making the
 * paid upstream AI call so server-side quotas can never be bypassed.
 */
export async function consumeCredit(
  userId: string,
  n = 1,
): Promise<{ plan: ServerPlanId; used: number; limit: number }> {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan];
  const month = currentMonth();

  // Atomic check + increment via Postgres function — prevents the
  // read-then-write race where two concurrent calls each pass the quota
  // check before either has written its new total.
  const { data, error } = await supabaseAdmin.rpc("consume_credit", {
    p_user_id: userId,
    p_n: n,
    p_limit: limit,
    p_month: month,
  });
  if (error) {
    if (error.message?.includes("QUOTA_EXCEEDED")) {
      throw new Error(
        `QUOTA_EXCEEDED: Monthly AI credit limit reached on the ${plan} plan (${limit} / month). Upgrade to continue generating.`,
      );
    }
    throw new Error(`Failed to record usage: ${error.message}`);
  }
  const nextUsed = typeof data === "number" ? data : Number(data);
  return { plan, used: nextUsed, limit };
}
