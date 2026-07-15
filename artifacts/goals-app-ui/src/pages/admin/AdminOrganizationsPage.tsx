import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth";

type AdminOrganization = {
  id: number;
  name: string;
  plan: string;
  ownerName: string;
  ownerEmail: string;
  projectCount: number;
  memberCount: number;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
};

type OrganizationsResponse = {
  organizations: AdminOrganization[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminOrganizationsPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);
  const [actionFlash, setActionFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<OrganizationsResponse>("/api/admin/organizations");
      setOrganizations(result.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  async function toggleSuspend(org: AdminOrganization) {
    setActionFlash(null);
    try {
      if (org.suspendedAt) {
        await apiFetch(`/api/admin/organizations/suspend?organizationId=${org.id}`, {
          method: "DELETE",
        });
        setActionFlash({ type: "success", message: `${org.name} unsuspended` });
      } else {
        const reason = window.prompt("Suspension reason (optional):") ?? undefined;
        await apiFetch("/api/admin/organizations/suspend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: org.id, reason }),
        });
        setActionFlash({ type: "success", message: `${org.name} suspended` });
      }
      await loadOrganizations();
    } catch (err) {
      setActionFlash({ type: "error", message: err instanceof Error ? err.message : "Action failed" });
    }
  }

  async function impersonateOrganization(orgId: number) {
    setImpersonatingId(orgId);
    try {
      await apiFetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setActionFlash({ type: "error", message: err instanceof Error ? err.message : "Failed to switch to org" });
      setImpersonatingId(null);
    }
  }

  return (
    <div className="max-w-5xl space-y-5 px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="mt-1 text-sm text-muted-foreground">All organizations on the platform.</p>
        </div>
        <Link
          to="/admin/organizations/onboard"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Onboard org
        </Link>
      </div>

      {actionFlash ? (
        <div
          className={
            actionFlash.type === "success"
              ? "rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
              : "rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700"
          }
        >
          {actionFlash.message}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading organizations…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : organizations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No organizations yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/admin/organizations/${org.id}`}
                    className="font-medium hover:underline"
                  >
                    {org.name}
                  </Link>
                  {org.suspendedAt && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700">
                      Suspended
                    </span>
                  )}
                  {org.subscriptionStatus && (
                    <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                      {org.subscriptionStatus.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Owner: {org.ownerName} ({org.ownerEmail})
                </p>
                {org.suspendedReason && (
                  <p className="mt-1 text-xs text-red-700">Reason: {org.suspendedReason}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(org.createdAt)} · {org.memberCount} members · {org.projectCount} projects
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                  {org.plan}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={impersonatingId === org.id}
                    onClick={() => void impersonateOrganization(org.id)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {impersonatingId === org.id ? "Switching…" : "Switch to org"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleSuspend(org)}
                    className={
                      org.suspendedAt
                        ? "rounded-md border border-border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                        : "rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/20"
                    }
                  >
                    {org.suspendedAt ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
