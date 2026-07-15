import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type OrganizationOption = {
  id: number;
  name: string;
};

type ProjectOption = {
  id: number;
  name: string;
  organizationId: number | null;
};

type PendingInvite = {
  id: number;
  email: string;
  organizationId: number;
  organizationName: string;
  role: string;
  assignedProjectId: number | null;
  expiresAt: string;
  createdAt: string;
};

const ROLES = ["owner", "site_admin", "editor", "viewer"] as const;
const ROLES_NEEDING_PROJECT = ["editor", "viewer"] as const;

const ROLE_HINTS: Record<(typeof ROLES)[number], string> = {
  owner: "Full org control including billing and members",
  site_admin: "Manage projects, integrations, and team access",
  editor: "Create and publish content for one assigned project",
  viewer: "Read-only access to one assigned project",
};

export function AdminUsersInvitePage() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("editor");
  const [assignedProjectId, setAssignedProjectId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orgsRes, projectsRes] = await Promise.all([
        apiFetch<{ organizations: Array<{ id: number; name: string }> }>("/api/admin/organizations"),
        apiFetch<ProjectOption[]>("/api/website-projects"),
      ]);
      setOrganizations(orgsRes.organizations.map((o) => ({ id: o.id, name: o.name })));
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const res = await apiFetch<{ invites: PendingInvite[] }>("/api/admin/invites");
      setInvites(res.invites);
    } catch {
      // non-critical
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadInvites();
  }, [loadData, loadInvites]);

  const orgProjects = organizationId
    ? projects.filter((p) => p.organizationId === Number.parseInt(organizationId, 10))
    : [];

  const needsProject = ROLES_NEEDING_PROJECT.includes(role as (typeof ROLES_NEEDING_PROJECT)[number]);

  async function sendInvite() {
    if (!email.trim() || !organizationId) {
      setFlash({ type: "error", message: "Email and organization are required" });
      return;
    }
    if (needsProject && !assignedProjectId) {
      setFlash({ type: "error", message: "Editors and viewers need an assigned project" });
      return;
    }

    setSubmitting(true);
    setFlash(null);
    try {
      const res = await apiFetch<{ emailSent?: boolean; inviteUrl?: string }>("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          organizationId: Number.parseInt(organizationId, 10),
          role,
          assignedProjectId: needsProject ? Number.parseInt(assignedProjectId, 10) : null,
        }),
      });

      if (res.emailSent) {
        setFlash({ type: "success", message: "Invitation email sent" });
      } else if (res.inviteUrl) {
        await navigator.clipboard.writeText(res.inviteUrl).catch(() => null);
        setFlash({ type: "success", message: "Invite created — link copied to clipboard" });
      } else {
        setFlash({ type: "success", message: "Invitation created" });
      }

      setEmail("");
      setAssignedProjectId("");
      await loadInvites();
    } catch (err) {
      setFlash({ type: "error", message: err instanceof Error ? err.message : "Failed to send invite" });
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeInvite(inviteId: number) {
    try {
      await apiFetch(`/api/admin/invites/${inviteId}`, { method: "DELETE" });
      await loadInvites();
    } catch (err) {
      setFlash({ type: "error", message: err instanceof Error ? err.message : "Could not revoke invite" });
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invite user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send an invitation to join an organization.
        </p>
      </div>

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

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 rounded-md bg-secondary/70" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-md bg-secondary/70" />
            <div className="h-10 rounded-md bg-secondary/70" />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Organization</label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={String(org.id)}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
            </div>
          </div>

          {needsProject ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assigned project</label>
              <select
                value={assignedProjectId}
                onChange={(e) => setAssignedProjectId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select project</option>
                {orgProjects.length === 0 ? (
                  <option disabled>No projects in this organization</option>
                ) : (
                  orgProjects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : null}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => void sendInvite()}
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send invitation"}
            </button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Pending invitations</h2>
          <p className="text-sm text-muted-foreground">Outstanding invites not yet accepted.</p>
        </div>

        {invitesLoading ? (
          <p className="text-sm text-muted-foreground">Loading pending invites…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Organization</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Sent</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-3 py-2">{invite.email}</td>
                    <td className="px-3 py-2 hover:underline">{invite.organizationName}</td>
                    <td className="px-3 py-2 capitalize">{invite.role.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void revokeInvite(invite.id)}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
