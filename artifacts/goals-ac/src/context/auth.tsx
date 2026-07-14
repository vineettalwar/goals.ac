import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { installAuthFetchInterceptor, SESSION_EXPIRED_EVENT } from "@/lib/auth-fetch";
import { safeJson } from "@/lib/safe-json";
import { AuthContext, type AuthUser } from "./auth-context";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SESSION_TOKEN_PLACEHOLDER = "session-cookie";

installAuthFetchInterceptor();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const token = user ? SESSION_TOKEN_PLACEHOLDER : null;

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await safeJson<any>(res);
      if (data) setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson<{ error?: string; user?: any }>(res);
    if (!res.ok) throw new Error(data?.error ?? "Login failed");
    setUser(data?.user ?? null);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await safeJson<{ error?: string; user?: any }>(res);
    if (!res.ok) throw new Error(data?.error ?? "Signup failed");
    setUser(data?.user ?? null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  }, []);

  const setAuth = useCallback((_token: string, usr: AuthUser) => {
    setUser(usr);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, signup, logout, setAuth, updateUser }),
    [user, token, isLoading, login, signup, logout, setAuth, updateUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
