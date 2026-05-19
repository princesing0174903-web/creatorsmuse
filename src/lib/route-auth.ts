import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Route-level auth guard. Runs in `beforeLoad`. On the client it validates
 * the Supabase session BEFORE the component mounts (no flash of protected
 * UI). On the server it is a no-op — no user data is loaded in SSR for
 * these pages, so we let the client hydrate and re-check.
 *
 * Server functions called from these routes still enforce
 * `requireSupabaseAuth` independently, so this guard is a UX layer, not a
 * security boundary.
 */
export async function requireAuthBeforeLoad(_args?: unknown) {
  if (typeof window === "undefined") return;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/login" });
  }
}
