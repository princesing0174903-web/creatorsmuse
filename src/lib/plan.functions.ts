import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUsageSnapshot, setUserPlan, PLAN_LIMITS } from "./usage.server";

export const getMyPlanUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getUsageSnapshot(context.userId);
  });

const PlanInput = z.object({
  plan: z.enum(["free", "pro", "creator"]),
});

export const setMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!(data.plan in PLAN_LIMITS)) throw new Error("Invalid plan");
    await setUserPlan(context.userId, data.plan);
    return getUsageSnapshot(context.userId);
  });
