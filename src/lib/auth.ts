import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = { id: string; email: string; name: string };

let cachedUser: AuthUser | null = null;
let cachedLoading = true;
let hydrated = false;
let bootstrapPromise: Promise<void> | null = null;
let listenerRegistered = false;
const listeners = new Set<(u: AuthUser | null, l: boolean, ready: boolean) => void>();

function emit() {
  for (const cb of listeners) cb(cachedUser, cachedLoading, hydrated);
}

function deriveName(session: Session | null): string {
  if (!session?.user) return "";
  const meta = (session.user.user_metadata ?? {}) as {
    display_name?: string;
    full_name?: string;
    name?: string;
  };
  return (
    meta.display_name ||
    meta.full_name ||
    meta.name ||
    session.user.email?.split("@")[0] ||
    "Creator"
  );
}

function sessionToUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: deriveName(session),
  };
}

/** Sync module cache + all useAuth subscribers (call after sign-in / OAuth). */
export function applySession(session: Session | null) {
  cachedUser = sessionToUser(session);
  cachedLoading = false;
  hydrated = true;
  emit();
}

function isInvalidRefreshError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("refresh token") ||
    m.includes("invalid claim") ||
    m.includes("session not found") ||
    m.includes("user not found")
  );
}

export function getAuthRedirectUrl(path = "/dashboard"): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/** True while URL still carries Supabase OAuth callback params (before exchange). */
export function isAuthCallbackUrl(): boolean {
  if (typeof window === "undefined") return false;
  const search = window.location.search;
  const hash = window.location.hash;
  return (
    search.includes("code=") ||
    search.includes("error=") ||
    search.includes("error_description=") ||
    hash.includes("access_token") ||
    hash.includes("refresh_token")
  );
}

function clearOAuthUrlParams() {
  if (typeof window === "undefined") return;
  const hasAuthHash =
    window.location.hash.includes("access_token") ||
    window.location.hash.includes("refresh_token");
  const hasAuthQuery =
    window.location.search.includes("code=") ||
    window.location.search.includes("error=") ||
    window.location.search.includes("error_description=");
  if (!hasAuthHash && !hasAuthQuery) return;
  window.history.replaceState(null, "", window.location.pathname);
}

/** Parse OAuth callback (PKCE code or implicit hash) before reading stored session. */
async function absorbOAuthCallback(): Promise<void> {
  if (typeof window === "undefined") return;

  const search = new URLSearchParams(window.location.search);
  const code = search.get("code");
  const oauthError = search.get("error_description") ?? search.get("error");

  if (oauthError) {
    clearOAuthUrlParams();
    throw new Error(oauthError);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (data.session) applySession(data.session);
    clearOAuthUrlParams();
    return;
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (hash.includes("access_token") || hash.includes("error=")) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) applySession(data.session);
    clearOAuthUrlParams();
  }
}

async function enrichProfile(session: Session) {
  const uid = session.user.id;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", uid)
      .maybeSingle();
    if (data?.display_name && cachedUser?.id === uid) {
      cachedUser = { ...cachedUser, name: data.display_name as string };
      emit();
    }
  } catch {
    // Profile enrichment must never break auth.
  }
}

function handleAuthEvent(event: AuthChangeEvent, session: Session | null) {
  if (event === "SIGNED_OUT") {
    applySession(null);
    return;
  }

  if (event === "TOKEN_REFRESHED" && !session) {
    applySession(null);
    return;
  }

  if (
    event === "INITIAL_SESSION" ||
    event === "SIGNED_IN" ||
    event === "TOKEN_REFRESHED" ||
    event === "USER_UPDATED"
  ) {
    // Ignore stale INITIAL_SESSION=null after a successful sign-in in the same tick.
    if (event === "INITIAL_SESSION" && !session && cachedUser) return;
    applySession(session);
    if (session?.user) void enrichProfile(session);
  }
}

async function resolveInitialSession() {
  try {
    await absorbOAuthCallback();
  } catch (err) {
    console.error("[auth] OAuth callback failed:", err);
    applySession(null);
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    if (isInvalidRefreshError(error.message)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
    applySession(null);
    return;
  }

  applySession(session ?? null);
  if (session?.user) void enrichProfile(session);
}

/** Single Supabase auth subscription + initial session read. */
export function initAuth() {
  bootstrap();
}

function bootstrap() {
  if (bootstrapPromise) return;
  bootstrapPromise = (async () => {
    if (!listenerRegistered) {
      listenerRegistered = true;
      supabase.auth.onAuthStateChange((event, session) => {
        handleAuthEvent(event, session);
      });
    }
    await resolveInitialSession();
  })();
}

/** Resolves once the first Supabase session read (and OAuth callback) completes. */
export function waitForAuthHydration(): Promise<AuthUser | null> {
  bootstrap();
  if (hydrated) return Promise.resolve(cachedUser);
  return bootstrapPromise!.then(() => cachedUser);
}

/** Read session from Supabase and sync cache (use in route guards). */
export async function getClientSession(): Promise<Session | null> {
  await waitForAuthHydration();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    if (isInvalidRefreshError(error.message)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      applySession(null);
    }
    return null;
  }
  if (session) applySession(session);
  return session;
}

export function useAuth() {
  bootstrap();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(cachedLoading);
  const [ready, setReady] = useState(hydrated);

  useEffect(() => {
    setUser(cachedUser);
    setLoading(cachedLoading);
    setReady(hydrated);
    const cb = (u: AuthUser | null, l: boolean, r: boolean) => {
      setUser(u);
      setLoading(l);
      setReady(r);
    };
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  return { user, loading, ready, isAuthenticated: !!user };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.session) applySession(data.session);
  return data;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl("/login"),
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  if (data.session) applySession(data.session);
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl("/dashboard"),
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  applySession(null);
}

/** Alias of `waitForAuthHydration` used by route guards. */
export async function ensureAuthReady(): Promise<void> {
  await waitForAuthHydration();
}

/** Synchronous snapshot of the auth cache (use after `ensureAuthReady`). */
export function getAuthSnapshot(): {
  user: AuthUser | null;
  loading: boolean;
  ready: boolean;
} {
  return { user: cachedUser, loading: cachedLoading, ready: hydrated };
}

/** Run OAuth callback exchange and return the resulting session (or null). */
export async function completeOAuthCallback(): Promise<Session | null> {
  await absorbOAuthCallback();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) applySession(data.session);
  return data.session ?? null;
}

const AUTH_ERROR_KEY = "cm:auth-error";

export function stashAuthError(message: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AUTH_ERROR_KEY, message);
  } catch {
    // ignore storage errors
  }
}

export function consumeAuthErrorMessage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const msg = window.sessionStorage.getItem(AUTH_ERROR_KEY);
    if (msg) window.sessionStorage.removeItem(AUTH_ERROR_KEY);
    return msg;
  } catch {
    return null;
  }
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl("/reset-password"),
  });
  if (error) throw error;
}

/** For password-recovery links: parse the hash and return the new session. */
export async function recoverSessionFromHash(): Promise<Session | null> {
  if (typeof window === "undefined") return null;
  try {
    await absorbOAuthCallback();
  } catch {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  if (data.session) applySession(data.session);
  return data.session ?? null;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// Bootstrap before React paint so OAuth callbacks never flash the login form.
if (typeof window !== "undefined") {
  initAuth();
}
