import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { PLAN_LABELS, normalizePlanId } from "@/lib/billing/plans";

interface OrganizationDetailResponse {
  organization: {
    id: number;
    name: string;
    plan: string;
    ownerEmail: string;
    ownerName: string;
    companyId: number | null;
    createdAt: string;
    suspendedAt: string | null;
    suspendedReason: string | null;
    subscriptionStatus: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: string | null;
    projectCount: number;
    memberCount: number;
  };
  members: Array<{
    id: number;
    userId: number;
    role: string;
    assignedProjectId: number | null;
    email: string;
    name: string;
  }>;
  projects: Array<{
    id: number;
    name: string;
    url: string;
    userId: number;
    createdAt: string;
  }>;
  auditLog: Array<{
    id: number;
    action: string;
    actorUserId: number | null;
    resourceType: string | null;
    resourceId: string | null;
    createdAt: string;
  }>;
  creditBalance: number | null;
  workspaceId: number | null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-all font-mono text-xs">{value ?? "—"}</dd>
    </div>
  );
}

export function AdminOrganizationDetailPage({ organizationId }: { organizationId: number }) {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<OrganizationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState<number | "org" | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<OrganizationDetailResponse>(
        `/api/admin/organizations/${organizationId}`,
      );
      setDetail(data);
    } catch (err) {
      setFlash({ type: "error", message: err instanceof Error ? err.message : "Failed to load organization" });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function toggleSuspend() {
    if (!detail) return;
    const org = detail.organization;
    setFlash(null);
    try {
      if (org.suspendedAt) {
        await apiFetch(`/api/admin/organizations/suspend?organizationId=${org.id}`, {
          method: "DELETE",
        });
        setFlash({ type: "success", message: `${org.name} unsuspended` });
      } else {
        const reason = window.prompt("Suspension reason (optional):") ?? undefined;
        await apiFetch("/api/admin/organizations/suspend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: org.id, reason }),
        });
        setFlash({ type: "success", message: `${org.name} suspended` });
      }
      await loadDetail();
    } catch (err) {
      setFlash({ type: "error", message: err instanceof Error ? err.message : "Action failed" });
    }
  }

  async function impersonateOrg() {
    setImpersonatingId("org");
    try {
      await apiFetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setFlash({ type: "error", message: err instanceof Error ? err.message : "Failed to switch org" });
      setImpersonatingId(null);
    }
  }

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
      setFlash({ type: "error", message: err instanceof Error ? err.message : "Failed to impersonate user" });
      setImpersonatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading organization…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-6xl space-y-4 px-8 py-8">
        <Link to="/admin/organizations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to organizations
        </Link>
        <p className="text-sm text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  const { organization: org } = detail;

  return (
    <div className="max-w-6xl space-y-6 px-8 py-8">
      <Link to="/admin/organizations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to organizations
      </Link>

      {flash ? (
        <div
          className={
            flash.type === "success"
              ? "rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
              : "rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700"
          }
        >
          {flash.message}
        </div>
      ) : null}

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          {org.suspendedAt && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700">Suspended</span>
          )}
          {org.subscriptionStatus && (
            <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
              {org.subscriptionStatus.replace(/_/g, " ")}
            </span>
          )}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
            {PLAN_LABELS[normalizePlanId(org.plan)]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Owner: {org.ownerName} ({org.ownerEmail}) · Created {formatDate(org.createdAt)}
        </p>
        {org.suspendedReason && (
          <p className="text-xs text-red-700">Suspension reason: {org.suspendedReason}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={impersonatingId === "org"}
            onClick={() => void impersonateOrg()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {impersonatingId === "org" ? "Switching…" : "Switch to org"}
          </button>
          <button
            type="button"
            onClick={() => void toggleSuspend()}
            className={
              org.suspendedAt
                ? "rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                : "rounded-md bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/20"
            }
          >
            {org.suspendedAt ? "Unsuspend organization" : "Suspend organization"}
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={String(org.memberCount)} />
        <StatCard label="Projects" value={String(org.projectCount)} />
        <StatCard
          label="Credit balance"
          value={detail.creditBalance != null ? String(detail.creditBalance) : "—"}
        />
        <StatCard
          label="Workspace ID"
          value={detail.workspaceId != null ? String(detail.workspaceId) : "—"}
        />
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Billing</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <DetailRow label="Stripe customer" value={org.stripeCustomerId} />
          <DetailRow label="Subscription" value={org.stripeSubscriptionId} />
          <DetailRow label="Price ID" value={org.stripePriceId} />
          <DetailRow label="Period ends" value={formatDate(org.currentPeriodEnd)} />
        </dl>
      </section>

      <section className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Members</h2>
        </div>
        {detail.members.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No members.</p>
        ) : (
          <div className="divide-y">
            {detail.members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                    {member.role.replace(/_/g, " ")}
                  </span>
                  <button
                    type="button"
                    disabled={impersonatingId === member.userId}
                    onClick={() => void impersonateUser(member.userId)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {impersonatingId === member.userId ? "Starting…" : "View as user"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Projects</h2>
        </div>
        {detail.projects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No projects.</p>
        ) : (
          <div className="divide-y">
            {detail.projects.map((project) => (
              <div key={project.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{project.name}</p>
                <p className="text-muted-foreground">{project.url}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ID {project.id} · Created {formatDate(project.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent audit log</h2>
        </div>
        {detail.auditLog.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <div className="divide-y">
            {detail.auditLog.map((entry) => (
              <div key={entry.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{entry.action}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                </div>
                {(entry.resourceType || entry.resourceId) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.resourceType ?? "resource"}
                    {entry.resourceId ? ` · ${entry.resourceId}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
