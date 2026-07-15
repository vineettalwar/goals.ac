import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
};

type ImpersonationInfo = {
  adminId: number;
  adminName: string | null;
  adminEmail: string | null;
};

type SupportOrganizationInfo = {
  id: number;
  name: string;
};

type MeResponse = {
  user: AuthUser;
  organizationId?: number | null;
  organizationName?: string | null;
  orgRole?: string | null;
  impersonation?: ImpersonationInfo | null;
  supportOrganization?: SupportOrganizationInfo | null;
};

/** Express returns a flat user; Next/CF may nest under `user`. */
function normalizeMeResponse(raw: unknown): MeResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const nested = data.user;
  const source =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : data;

  if (typeof source.id !== "number" || typeof source.email !== "string") {
    return null;
  }

  return {
    user: {
      id: source.id,
      email: source.email,
      name: typeof source.name === "string" ? source.name : null,
      role: typeof source.role === "string" ? source.role : "user",
      avatarUrl: typeof source.avatarUrl === "string" ? source.avatarUrl : null,
    },
    organizationId:
      typeof data.organizationId === "number" ? data.organizationId : null,
    organizationName:
      typeof data.organizationName === "string" ? data.organizationName : null,
    orgRole: typeof data.orgRole === "string" ? data.orgRole : null,
    impersonation: (data.impersonation as ImpersonationInfo | null) ?? null,
    supportOrganization:
      (data.supportOrganization as SupportOrganizationInfo | null) ?? null,
  };
}

type AuthState = {
  user: AuthUser | null;
  organizationId: number | null;
  organizationName: string | null;
  orgRole: string | null;
  impersonation: ImpersonationInfo | null;
  supportOrganization: SupportOrganizationInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function applyMeResponse(
  data: MeResponse,
  setUser: (user: AuthUser | null) => void,
  setOrganizationId: (id: number | null) => void,
  setOrganizationName: (name: string | null) => void,
  setOrgRole: (role: string | null) => void,
  setImpersonation: (info: ImpersonationInfo | null) => void,
  setSupportOrganization: (info: SupportOrganizationInfo | null) => void,
) {
  setUser(data.user);
  setOrganizationId(data.organizationId ?? null);
  setOrganizationName(data.organizationName ?? null);
  setOrgRole(data.orgRole ?? null);
  setImpersonation(data.impersonation ?? null);
  setSupportOrganization(data.supportOrganization ?? null);
}

function clearAuthState(
  setUser: (user: AuthUser | null) => void,
  setOrganizationId: (id: number | null) => void,
  setOrganizationName: (name: string | null) => void,
  setOrgRole: (role: string | null) => void,
  setImpersonation: (info: ImpersonationInfo | null) => void,
  setSupportOrganization: (info: SupportOrganizationInfo | null) => void,
) {
  setUser(null);
  setOrganizationId(null);
  setOrganizationName(null);
  setOrgRole(null);
  setImpersonation(null);
  setSupportOrganization(null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationInfo | null>(null);
  const [supportOrganization, setSupportOrganization] = useState<SupportOrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const raw = await apiFetch<unknown>("/api/auth/me");
      const data = normalizeMeResponse(raw);
      if (!data) {
        clearAuthState(setUser, setOrganizationId, setOrganizationName, setOrgRole, setImpersonation, setSupportOrganization);
        return;
      }
      applyMeResponse(data, setUser, setOrganizationId, setOrganizationName, setOrgRole, setImpersonation, setSupportOrganization);
    } catch {
      clearAuthState(setUser, setOrganizationId, setOrganizationName, setOrgRole, setImpersonation, setSupportOrganization);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const raw = await apiFetch<unknown>("/api/auth/me");
    const data = normalizeMeResponse(raw);
    if (!data) throw new Error("Invalid session response");
    applyMeResponse(data, setUser, setOrganizationId, setOrganizationName, setOrgRole, setImpersonation, setSupportOrganization);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    await apiFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const raw = await apiFetch<unknown>("/api/auth/me");
    const data = normalizeMeResponse(raw);
    if (!data) throw new Error("Invalid session response");
    applyMeResponse(data, setUser, setOrganizationId, setOrganizationName, setOrgRole, setImpersonation, setSupportOrganization);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    } finally {
      clearAuthState(setUser, setOrganizationId, setOrganizationName, setOrgRole, setImpersonation, setSupportOrganization);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      organizationId,
      organizationName,
      orgRole,
      impersonation,
      supportOrganization,
      loading,
      refresh,
      login,
      signup,
      logout,
    }),
    [user, organizationId, organizationName, orgRole, impersonation, supportOrganization, loading, refresh, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
