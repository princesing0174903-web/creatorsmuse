import { useEffect, useState } from "react";
<<<<<<< HEAD
import type { Session } from "@supabase/supabase-js";
=======
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = { id: string; email: string; name: string };

<<<<<<< HEAD
function deriveName(session: Session | null): string {
  if (!session?.user) return "";
  const meta = (session.user.user_metadata ?? {}) as { display_name?: string; full_name?: string };
  return meta.display_name || meta.full_name || session.user.email?.split("@")[0] || "Creator";
}

export const AUTH_ERROR_STORAGE_KEY = "creators_muse_auth_error";

let cachedUser: AuthUser | null = null;
let cachedLoading = true;
let bootstrapped = false;
let authReady = false;
let readyPromise: Promise<void> | null = null;
let oauthExchangePromise: Promise<Session | null> | null = null;
let oauthCallbackHandled = false;
let profileRequestId = 0;

const listeners = new Set<(u: AuthUser | null, l: boolean) => void>();
const readyListeners = new Set<() => void>();

function emit() {
  for (const cb of listeners) cb(cachedUser, cachedLoading);
}

function markReady() {
  if (authReady) return;
  authReady = true;
  cachedLoading = false;
  emit();
  for (const cb of readyListeners) cb();
  readyListeners.clear();
}

export function hydrateFromSession(session: Session | null) {
  cachedUser = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        name: deriveName(session),
      }
    : null;
  emit();
}

function enrichProfile(userId: string) {
  const requestId = ++profileRequestId;
  void (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (requestId !== profileRequestId) return;
    if (data?.display_name && cachedUser?.id === userId) {
      cachedUser = { ...cachedUser, name: data.display_name as string };
      emit();
    }
  })();
}

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    hydrateFromSession(session);
    markReady();
    if (session?.user) enrichProfile(session.user.id);
    else profileRequestId++;
  });
}

export function getAuthSnapshot() {
  return { user: cachedUser, loading: cachedLoading };
}

export function consumeAuthErrorMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY);
  if (message) sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY);
  return message;
}

export function stashAuthError(message: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, message);
}

function isAuthCallbackPath() {
  return typeof window !== "undefined" && window.location.pathname === "/auth/callback";
}

export function hasOAuthCallbackParams(): boolean {
  if (typeof window === "undefined" || !isAuthCallbackPath()) return false;
  const url = new URL(window.location.href);
  return (
    url.searchParams.has("code") ||
    url.searchParams.has("error") ||
    url.searchParams.has("error_description") ||
    url.hash.includes("access_token=") ||
    url.hash.includes("type=recovery")
  );
}

function cleanOAuthUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", "/auth/callback");
}

/** Password-recovery links use hash tokens on /reset-password (not the OAuth callback). */
export async function recoverSessionFromHash(): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    window.history.replaceState(window.history.state, "", window.location.pathname);
    if (error) throw error;
    if (data.session) hydrateFromSession(data.session);
    return data.session;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Exchange PKCE code / consume hash tokens — never renders URL params to the DOM. */
export async function completeOAuthCallback(): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  if (oauthCallbackHandled) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  if (!hasOAuthCallbackParams()) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) hydrateFromSession(data.session);
    return data.session;
  }

  if (!oauthExchangePromise) {
    oauthExchangePromise = (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const oauthError = url.searchParams.get("error");
      const oauthErrorDescription = url.searchParams.get("error_description");

      if (oauthError) {
        cleanOAuthUrl();
        throw new Error(oauthErrorDescription || oauthError);
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        cleanOAuthUrl();
        if (error) throw error;
        if (data.session) {
          hydrateFromSession(data.session);
          enrichProfile(data.session.user.id);
          return data.session;
        }
        return null;
      }

      const { data, error } = await supabase.auth.getSession();
      cleanOAuthUrl();
      if (error) throw error;
      if (data.session) {
        hydrateFromSession(data.session);
        enrichProfile(data.session.user.id);
      }
      return data.session;
    })();
  }

  const session = await oauthExchangePromise;
  oauthCallbackHandled = true;
  return session;
}

export function ensureAuthReady(): Promise<void> {
  bootstrap();
  if (authReady) return Promise.resolve();
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve) => {
      readyListeners.add(resolve);
      void (async () => {
        try {
          if (hasOAuthCallbackParams()) {
            await completeOAuthCallback();
            return;
          }
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          hydrateFromSession(data.session);
          if (data.session?.user) enrichProfile(data.session.user.id);
        } catch {
          // Callback route / login will surface a user-friendly toast.
        } finally {
          markReady();
        }
      })();
    });
  }
  return readyPromise;
=======
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
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
}

export function useAuth() {
  bootstrap();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(cachedLoading);
<<<<<<< HEAD
=======
  const [ready, setReady] = useState(hydrated);
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc

  useEffect(() => {
    setUser(cachedUser);
    setLoading(cachedLoading);
<<<<<<< HEAD
    const cb = (u: AuthUser | null, l: boolean) => {
      setUser(u);
      setLoading(l);
=======
    setReady(hydrated);
    const cb = (u: AuthUser | null, l: boolean, r: boolean) => {
      setUser(u);
      setLoading(l);
      setReady(r);
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
    };
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

<<<<<<< HEAD
  return { user, loading };
}

export function authRedirectUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authRedirectUrl("/auth/callback"),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
=======
  return { user, loading, ready, isAuthenticated: !!user };
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
<<<<<<< HEAD
  if (data.session) hydrateFromSession(data.session);
=======
  if (data.session) applySession(data.session);
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  return data;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
<<<<<<< HEAD
      emailRedirectTo: authRedirectUrl("/auth/callback"),
=======
      emailRedirectTo: getAuthRedirectUrl("/login"),
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
<<<<<<< HEAD
  if (data.session) hydrateFromSession(data.session);
  return data;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl("/reset-password"),
=======
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
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  });
  if (error) throw error;
}

<<<<<<< HEAD
export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  if (data.user) {
    const { data: sessionData } = await supabase.auth.getSession();
    hydrateFromSession(sessionData.session);
  }
  return data;
}

export async function signOut() {
  profileRequestId++;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  hydrateFromSession(null);
=======
export async function signOut() {
  await supabase.auth.signOut();
  applySession(null);
}

// Bootstrap before React paint so OAuth callbacks never flash the login form.
if (typeof window !== "undefined") {
  initAuth();
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
}
