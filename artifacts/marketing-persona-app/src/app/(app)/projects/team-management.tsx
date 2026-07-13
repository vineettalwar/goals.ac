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

interface OrgMemberRow {
  userId: number;
  email: string;
  name: string;
  role: "site_admin" | "member";
  assignedProjectId: number | null;
}

interface TeamManagementProps {
  projects: WebsiteProject[];
}

export function TeamManagement({ projects }: TeamManagementProps) {
  const [members, setMembers] = useState<OrgMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"site_admin" | "member">("member");
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
    if (inviteRole === "member" && !inviteProjectId) {
      toast.error("Select a site for this member");
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
          assignedProjectId: inviteRole === "member" ? Number.parseInt(inviteProjectId, 10) : null,
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

  async function updateMember(member: OrgMemberRow, role: "site_admin" | "member", assignedProjectId: number | null) {
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

  return (
    <div className="paper-card mb-6 p-5">
      <h2 className="text-sm font-semibold">Team access</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Site admins see all projects. Members can only access their assigned site.
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
          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "site_admin" | "member")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site_admin">Site admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {inviteRole === "member" && (
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
          members.map((member) => (
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
                  value={member.role}
                  onValueChange={(role) =>
                    void updateMember(
                      member,
                      role as "site_admin" | "member",
                      role === "member" ? member.assignedProjectId : null,
                    )
                  }
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site_admin">Site admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                {member.role === "member" && (
                  <Select
                    value={member.assignedProjectId != null ? String(member.assignedProjectId) : undefined}
                    onValueChange={(projectId) =>
                      void updateMember(member, "member", Number.parseInt(projectId, 10))
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
