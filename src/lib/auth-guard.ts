import { redirect } from "@tanstack/react-router";
import { ensureAuthReady, getAuthSnapshot } from "@/lib/auth";

export async function requireAuthBeforeLoad() {
  await ensureAuthReady();
  if (!getAuthSnapshot().user) {
    throw redirect({ to: "/login" });
  }
}

export async function redirectIfAuthenticated() {
  await ensureAuthReady();
  if (getAuthSnapshot().user) {
    throw redirect({ to: "/dashboard" });
  }
}
