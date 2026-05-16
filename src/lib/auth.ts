import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = { id: string; email: string; name: string };

function deriveName(session: Session | null): string {
  if (!session?.user) return "";
  const meta = (session.user.user_metadata ?? {}) as { display_name?: string };
  return meta.display_name || session.user.email?.split("@")[0] || "Creator";
}

// Module-level cache so route transitions don't re-show a loading flash.
let cachedUser: AuthUser | null = null;
let cachedLoading = true;
let bootstrapped = false;
const listeners = new Set<(u: AuthUser | null, l: boolean) => void>();

function emit() {
  for (const cb of listeners) cb(cachedUser, cachedLoading);
}

function setFromSession(session: Session | null) {
  cachedUser = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        name: deriveName(session),
      }
    : null;
  cachedLoading = false;
  emit();
}

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    setFromSession(session);

    if (session?.user) {
      // Deferred profile enrichment — never blocks the UI.
      setTimeout(async () => {
        const uid = session.user.id;
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", uid)
          .maybeSingle();
        if (data?.display_name && cachedUser && cachedUser.id === uid) {
          cachedUser = { ...cachedUser, name: data.display_name as string };
          emit();
        }
      }, 0);
    }
  });

  // Kick off initial session resolution. onAuthStateChange also fires
  // INITIAL_SESSION, but calling getSession primes the cache faster on cold loads.
  supabase.auth.getSession().then(({ data: { session } }) => {
    setFromSession(session);
  });
}

export function useAuth() {
  bootstrap();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState<boolean>(cachedLoading);

  useEffect(() => {
    // Sync immediately in case cache changed between render and effect.
    setUser(cachedUser);
    setLoading(cachedLoading);
    const cb = (u: AuthUser | null, l: boolean) => {
      setUser(u);
      setLoading(l);
    };
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  return { user, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}