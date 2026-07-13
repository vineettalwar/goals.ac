"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrganizationOption {
  id: number;
  name: string;
}

interface ProjectOption {
  id: number;
  name: string;
  organizationId: number | null;
}

const ROLES = ["owner", "site_admin", "editor", "viewer"] as const;
const ROLES_NEEDING_PROJECT = ["editor", "viewer"] as const;

export function AdminInviteUserCard() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("editor");
  const [assignedProjectId, setAssignedProjectId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orgsRes, projectsRes] = await Promise.all([
        fetch("/api/admin/organizations"),
        fetch("/api/website-projects"),
      ]);
      if (orgsRes.ok) {
        const orgData = (await orgsRes.json()) as {
          organizations: Array<{ id: number; name: string }>;
        };
        setOrganizations(orgData.organizations.map((o) => ({ id: o.id, name: o.name })));
      }
      if (projectsRes.ok) {
        const projectData = (await projectsRes.json()) as ProjectOption[];
        setProjects(projectData);
      }
    } catch {
      toast.error("Could not load invite options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const orgProjects = organizationId
    ? projects.filter((p) => p.organizationId === Number.parseInt(organizationId, 10))
    : [];

  async function sendInvite() {
    if (!email.trim() || !organizationId) {
      toast.error("Email and organization are required");
      return;
    }
    if (ROLES_NEEDING_PROJECT.includes(role as (typeof ROLES_NEEDING_PROJECT)[number]) && !assignedProjectId) {
      toast.error("Editors and viewers need an assigned project");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          organizationId: Number.parseInt(organizationId, 10),
          role,
          assignedProjectId: ROLES_NEEDING_PROJECT.includes(role as (typeof ROLES_NEEDING_PROJECT)[number])
            ? Number.parseInt(assignedProjectId, 10)
            : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send invite");
        return;
      }

      if (data.emailSent) {
        toast.success("Invitation email sent");
      } else if (data.inviteUrl) {
        toast.success("Invite created (email not configured — copy link from response)");
        await navigator.clipboard.writeText(data.inviteUrl as string);
        toast.message("Invite link copied to clipboard");
      } else {
        toast.success("Invitation created");
      }

      setEmail("");
      setAssignedProjectId("");
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="paper-card p-5 space-y-4">
      <div>
        <h2 className="font-medium">Invite user</h2>
        <p className="text-sm text-muted-foreground">
          Send an email invitation to join an organization on the platform.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Organization</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as (typeof ROLES)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ROLES_NEEDING_PROJECT.includes(role as (typeof ROLES_NEEDING_PROJECT)[number]) && (
            <div className="space-y-1.5">
              <Label>Assigned project</Label>
              <Select value={assignedProjectId} onValueChange={setAssignedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {orgProjects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <Button onClick={() => void sendInvite()} disabled={submitting || loading}>
        {submitting ? "Sending…" : "Send invitation"}
      </Button>
    </div>
  );
}
