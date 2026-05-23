import { initAuth } from "@/lib/auth";

/** Ensures auth bootstrap runs (also started at module load in auth.ts). */
export function AuthInit() {
  initAuth();
  return null;
}
