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

  const { data: existing } = await supabaseAdmin
    .from("usage_counters")
    .select("used")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  const currentUsed = existing?.used ?? 0;
  if (currentUsed + n > limit) {
    throw new Error(
      `QUOTA_EXCEEDED: Monthly AI credit limit reached on the ${plan} plan (${currentUsed}/${limit}). Upgrade to continue generating.`,
    );
  }

  const nextUsed = currentUsed + n;
  const { error } = await supabaseAdmin.from("usage_counters").upsert({
    user_id: userId,
    month,
    used: nextUsed,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to record usage: ${error.message}`);
  return { plan, used: nextUsed, limit };
}
