import { redirect } from "@tanstack/react-router";
import { getClientSession, isAuthCallbackUrl } from "@/lib/auth";

/**
 * Client route guard: waits for hydration, validates Supabase session.
 * Server functions still enforce `requireSupabaseAuth` separately.
 */
export async function requireAuthBeforeLoad() {
  if (typeof window === "undefined") return;

  const session = await getClientSession();
  if (!session?.user) {
    throw redirect({ to: "/login" });
  }
}

/** Use on /login so authenticated users (and OAuth callbacks) never see the sign-in form. */
export async function redirectIfAuthenticated() {
  if (typeof window === "undefined") return;

  const session = await getClientSession();
  if (session?.user) {
    throw redirect({ to: "/dashboard", replace: true });
  }

  // Stale callback URL without a session — strip params so the login form can render.
  if (isAuthCallbackUrl()) {
    window.history.replaceState(null, "", window.location.pathname);
  }
}
