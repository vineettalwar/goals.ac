"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_LABELS, normalizePlanId } from "@/lib/billing/plans";
import { useAdminImpersonation } from "@/hooks/use-admin-impersonation";

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

export function AdminOrganizationDetailPanel({ organizationId }: { organizationId: number }) {
  const [detail, setDetail] = useState<OrganizationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { impersonateOrganization, impersonateUser, isImpersonating } = useAdminImpersonation();

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}`);
      if (!res.ok) throw new Error("Failed to load organization");
      const data = (await res.json()) as OrganizationDetailResponse;
      setDetail(data);
    } catch {
      toast.error("Could not load organization details");
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
    try {
      if (org.suspendedAt) {
        const res = await fetch(`/api/admin/organizations/suspend?organizationId=${org.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to unsuspend");
        toast.success(`${org.name} unsuspended`);
      } else {
        const reason = window.prompt("Suspension reason (optional):") ?? undefined;
        const res = await fetch("/api/admin/organizations/suspend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: org.id, reason }),
        });
        if (!res.ok) throw new Error("Failed to suspend");
        toast.success(`${org.name} suspended`);
      }
      await loadDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading organization…</p>;
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/organizations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to organizations
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  const { organization: org } = detail;

  return (
    <div className="max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/organizations">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to organizations
        </Link>
      </Button>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          {org.suspendedAt && (
            <Badge variant="destructive" className="text-xs">
              Suspended
            </Badge>
          )}
          {org.subscriptionStatus && (
            <Badge variant="outline" className="text-xs capitalize">
              {org.subscriptionStatus.replace(/_/g, " ")}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {PLAN_LABELS[normalizePlanId(org.plan)]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Owner: {org.ownerName} ({org.ownerEmail}) · Created {formatDate(org.createdAt)}
        </p>
        {org.suspendedReason && (
          <p className="text-xs text-destructive">Suspension reason: {org.suspendedReason}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={isImpersonating(`org-${org.id}`)}
            onClick={() => void impersonateOrganization(org.id)}
          >
            {isImpersonating(`org-${org.id}`) ? "Switching…" : "Switch to org"}
          </Button>
          <Button
            variant={org.suspendedAt ? "outline" : "destructive"}
            size="sm"
            onClick={() => void toggleSuspend()}
          >
            {org.suspendedAt ? "Unsuspend organization" : "Suspend organization"}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={String(org.memberCount)} />
        <StatCard label="Projects" value={String(org.projectCount)} />
        <StatCard
          label="Credit balance"
          value={detail.creditBalance != null ? String(detail.creditBalance) : "—"}
        />
        <StatCard label="Workspace ID" value={detail.workspaceId != null ? String(detail.workspaceId) : "—"} />
      </div>

      <section className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Billing</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <DetailRow label="Stripe customer" value={org.stripeCustomerId} />
          <DetailRow label="Subscription" value={org.stripeSubscriptionId} />
          <DetailRow label="Price ID" value={org.stripePriceId} />
          <DetailRow label="Period ends" value={formatDate(org.currentPeriodEnd)} />
        </dl>
      </section>

      <section className="rounded-xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Members</h2>
        </div>
        {detail.members.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No members.</p>
        ) : (
          <div className="divide-y divide-border">
            {detail.members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {member.role.replace(/_/g, " ")}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isImpersonating(member.userId)}
                    onClick={() => void impersonateUser(member.userId)}
                  >
                    {isImpersonating(member.userId) ? "Starting…" : "View as user"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Projects</h2>
        </div>
        {detail.projects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No projects.</p>
        ) : (
          <div className="divide-y divide-border">
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

      <section className="rounded-xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent audit log</h2>
        </div>
        {detail.auditLog.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <div className="divide-y divide-border">
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
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
