import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = { id: string; email: string; name: string };

function deriveName(session: Session | null): string {
  if (!session?.user) return "";
  const meta = (session.user.user_metadata ?? {}) as { display_name?: string };
  return meta.display_name || session.user.email?.split("@")[0] || "Creator";
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe FIRST, then read initial session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name: deriveName(session),
        });
      } else {
        setUser(null);
      }
      setLoading(false);

      // Optionally refresh display_name from profiles (deferred).
      if (session?.user) {
        setTimeout(async () => {
          const { data } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (data?.display_name) {
            setUser((prev) =>
              prev ? { ...prev, name: data.display_name as string } : prev,
            );
          }
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name: deriveName(session),
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}