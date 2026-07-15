import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth";

type AdminUser = {
  id: number;
  email: string;
  name: string;
  platformRole: string;
  plan: string;
  organizationId: number | null;
  organizationName: string | null;
  orgRole: string | null;
  projectCount: number;
  createdAt: string;
  status: "active" | "pending_invite" | "no_org";
};

type OrganizationOption = {
  id: number;
  name: string;
};

type UsersResponse = {
  users: AdminUser[];
  total: number;
};

const STATUS_LABELS: Record<AdminUser["status"], string> = {
  active: "Active",
  pending_invite: "Pending invite",
  no_org: "No org",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export function AdminUsersPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [organizationId, setOrganizationId] = useState("all");
  const [platformRole, setPlatformRole] = useState("all");

  const loadOrganizations = useCallback(async () => {
    try {
      const res = await apiFetch<{ organizations: OrganizationOption[] }>("/api/admin/organizations");
      setOrganizations(res.organizations);
    } catch {
      // non-critical, ignore
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (organizationId !== "all") params.set("organizationId", organizationId);
      if (platformRole !== "all") params.set("platformRole", platformRole);

      const data = await apiFetch<UsersResponse>(`/api/admin/users?${params.toString()}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, organizationId, platformRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  async function impersonateUser(userId: number) {
    setImpersonatingId(userId);
    try {
      await apiFetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to impersonate user");
      setImpersonatingId(null);
    }
  }

  return (
    <div className="max-w-5xl space-y-5 px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Directory of all platform users.</p>
        </div>
        <Link
          to="/admin/users/invite"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Invite user
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All organizations</option>
          {organizations.map((org) => (
            <option key={org.id} value={String(org.id)}>
              {org.name}
            </option>
          ))}
        </select>
        <select
          value={platformRole}
          onChange={(e) => setPlatformRole(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All platform roles</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="super_admin">super_admin</option>
        </select>
        <p className="ml-auto text-sm text-muted-foreground">{total} users</p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Platform</th>
              <th className="px-3 py-2 font-medium">Organization</th>
              <th className="px-3 py-2 font-medium">Org role</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Projects</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{user.name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
                  <td className="px-3 py-2">{user.platformRole}</td>
                  <td className="px-3 py-2">
                    {user.organizationId ? (
                      <Link
                        to={`/admin/organizations/${user.organizationId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {user.organizationName ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{user.orgRole ?? "—"}</td>
                  <td className="px-3 py-2">{user.plan}</td>
                  <td className="px-3 py-2">{user.projectCount}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        user.status === "active"
                          ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {STATUS_LABELS[user.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-3 py-2">
                    {user.platformRole !== "super_admin" && user.platformRole !== "admin" ? (
                      <button
                        type="button"
                        disabled={impersonatingId === user.id}
                        onClick={() => void impersonateUser(user.id)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        {impersonatingId === user.id ? "Starting…" : "View as user"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
