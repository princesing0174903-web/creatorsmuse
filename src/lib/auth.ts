import { useEffect, useState } from "react";

const KEY = "nexus.auth";

export type AuthUser = { email: string; name: string };

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(KEY, JSON.stringify(user));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("nexus-auth"));
}

export function useAuth() {
  const [user, set] = useState<AuthUser | null>(null);
  useEffect(() => {
    set(getUser());
    const h = () => set(getUser());
    window.addEventListener("nexus-auth", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("nexus-auth", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return user;
}