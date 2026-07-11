import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { installAuthFetchInterceptor, SESSION_EXPIRED_EVENT } from "@/lib/auth-fetch";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Auth now lives entirely in httpOnly `access_token` / `refresh_token`
// cookies set by the API — this app never reads or persists the JWT itself.
// A handful of pages still branch on "do I have a token" and attach it as an
// `Authorization: Bearer` header (mirroring the old client), so they get a
// non-secret placeholder instead of the real JWT. The placeholder never
// verifies as a JWT, so those requests fall through to the access_token
// cookie on the server (see requireAuth in the API), which is what actually
// authenticates them now that the global fetch interceptor sends
// credentials on every same-origin /api/* call.
const SESSION_TOKEN_PLACEHOLDER = "session-cookie";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  hasGeminiKey?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Installed once, at module load — well before any component has a chance
// to fire a request.
installAuthFetchInterceptor();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const token = user ? SESSION_TOKEN_PLACEHOLDER : null;

  const safeJson = async <T,>(r: Response): Promise<T | null> => {
    try { return await r.json(); } catch { return null; }
  };

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

  // The fetch interceptor dispatches this when a 401 survives a refresh
  // attempt — i.e. the session is genuinely gone. Treat that as logged out.
  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson<{ error?: string; user?: any }>(res);
    if (!res.ok) throw new Error(data?.error ?? "Login failed");
    setUser(data?.user ?? null);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await safeJson<{ error?: string; user?: any }>(res);
    if (!res.ok) throw new Error(data?.error ?? "Signup failed");
    setUser(data?.user ?? null);
  };

  const logout = () => {
    setUser(null);
    // Best-effort: revoke the session server-side and clear the cookies.
    // The UI already treats the user as logged out regardless of outcome.
    fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  };

  const setAuth = (_token: string, usr: AuthUser) => {
    // The server has already set the auth cookies by the time callers reach
    // for this (login/signup/oauth-callback/reset-password all do). Only
    // the user profile needs to land in state.
    setUser(usr);
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout, setAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
