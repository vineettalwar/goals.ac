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
import type { WebsiteProject } from "@workspace/db/schema";

type TeamRole = "owner" | "site_admin" | "editor" | "viewer";

interface OrgMemberRow {
  userId: number;
  email: string;
  name: string;
  role: TeamRole | "member";
  assignedProjectId: number | null;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  site_admin: "Site admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLES_NEEDING_PROJECT: TeamRole[] = ["editor", "viewer"];

interface TeamManagementProps {
  projects: WebsiteProject[];
}

function normalizeRole(role: OrgMemberRow["role"]): TeamRole {
  if (role === "member") return "editor";
  return role;
}

export function TeamManagement({ projects }: TeamManagementProps) {
  const [members, setMembers] = useState<OrgMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("editor");
  const [inviteProjectId, setInviteProjectId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations/members");
      if (!res.ok) throw new Error("Failed to load team");
      const data = (await res.json()) as { members: OrgMemberRow[] };
      setMembers(data.members);
    } catch {
      toast.error("Could not load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function addMember() {
    if (!inviteEmail.trim()) {
      toast.error("Enter a member email");
      return;
    }
    if (ROLES_NEEDING_PROJECT.includes(inviteRole) && !inviteProjectId) {
      toast.error("Select a site for this role");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/organizations/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          assignedProjectId: ROLES_NEEDING_PROJECT.includes(inviteRole)
            ? Number.parseInt(inviteProjectId, 10)
            : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add member");
      }
      toast.success("Team member updated");
      setInviteEmail("");
      setInviteProjectId("");
      await loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateMember(
    member: OrgMemberRow,
    role: TeamRole,
    assignedProjectId: number | null,
  ) {
    try {
      const res = await fetch(`/api/organizations/members/${member.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, assignedProjectId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update member");
      }
      toast.success("Member updated");
      await loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update member");
    }
  }

  async function removeMember(member: OrgMemberRow) {
    if (!window.confirm(`Remove ${member.email} from the organization?`)) return;
    try {
      const res = await fetch(`/api/organizations/members/${member.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to remove member");
      }
      toast.success("Member removed");
      await loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <div className="paper-card mb-6 p-5">
      <h2 className="text-sm font-semibold">Team access</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Owners and site admins manage all projects. Editors can create and publish content. Viewers are read-only.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="member-email">User email</Label>
          <Input
            id="member-email"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABELS) as TeamRole[])
                .filter((r) => r !== "owner")
                .map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {ROLES_NEEDING_PROJECT.includes(inviteRole) && (
          <div className="space-y-1.5">
            <Label>Assigned site</Label>
            <Select value={inviteProjectId} onValueChange={setInviteProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-end">
          <Button onClick={() => void addMember()} disabled={submitting}>
            Add member
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading team…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members yet.</p>
        ) : (
          members.map((member) => {
            const role = normalizeRole(member.role);
            const isOwner = role === "owner";
            return (
              <div
                key={member.userId}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={role}
                    disabled={isOwner}
                    onValueChange={(nextRole) =>
                      void updateMember(
                        member,
                        nextRole as TeamRole,
                        ROLES_NEEDING_PROJECT.includes(nextRole as TeamRole)
                          ? member.assignedProjectId
                          : null,
                      )
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as TeamRole[]).map((r) => (
                        <SelectItem key={r} value={r} disabled={r === "owner"}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {ROLES_NEEDING_PROJECT.includes(role) && (
                    <Select
                      value={member.assignedProjectId != null ? String(member.assignedProjectId) : undefined}
                      onValueChange={(projectId) =>
                        void updateMember(member, role, Number.parseInt(projectId, 10))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assign site" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={String(project.id)}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!isOwner && (
                    <Button variant="ghost" size="sm" onClick={() => void removeMember(member)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
