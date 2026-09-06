import { useState } from "react";
import { cn } from "../cn";
import type { ProjectListItem } from "./projects-ui";

export type TeamRole = "owner" | "site_admin" | "editor" | "viewer";

export type OrgMemberRow = {
  userId: number;
  email: string;
  name: string;
  role: TeamRole | "member" | string;
  assignedProjectId: number | null;
  joinedAt: string | null;
};

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  site_admin: "Site admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLES_NEEDING_PROJECT: TeamRole[] = ["editor", "viewer"];

function normalizeRole(role: OrgMemberRow["role"]): TeamRole {
  if (role === "member") return "editor";
  if (role === "owner" || role === "site_admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return "editor";
}

function formatJoinedAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  compact,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? undefined : "space-y-1.5"}>
      {!compact ? (
        <label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <select
        id={id}
        aria-label={label}
        disabled={disabled}
        className={cn(
          "rounded-lg border border-input bg-card px-2.5 text-sm",
          compact ? "h-8 w-32.5" : "h-9 w-full",
          disabled && "cursor-not-allowed opacity-60",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TeamManagementView({
  members,
  projects,
  loading,
  error,
  submitting,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
}: {
  members: OrgMemberRow[];
  projects: ProjectListItem[];
  loading: boolean;
  error: string | null;
  submitting?: boolean;
  onAddMember: (input: {
    email: string;
    role: TeamRole;
    assignedProjectId: number | null;
  }) => Promise<void>;
  onUpdateMember: (
    member: OrgMemberRow,
    role: TeamRole,
    assignedProjectId: number | null,
  ) => Promise<void>;
  onRemoveMember: (member: OrgMemberRow) => Promise<void>;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("editor");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAddMember() {
    setActionError(null);
    if (!inviteEmail.trim()) {
      setActionError("Enter a member email");
      return;
    }
    if (ROLES_NEEDING_PROJECT.includes(inviteRole) && !inviteProjectId) {
      setActionError("Select a site for this role");
      return;
    }

    try {
      await onAddMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        assignedProjectId: ROLES_NEEDING_PROJECT.includes(inviteRole)
          ? Number.parseInt(inviteProjectId, 10)
          : null,
      });
      setInviteEmail("");
      setInviteProjectId("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  return (
    <div className="paper-card mb-6 p-5">
      <h2 className="text-sm font-semibold">Team access</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Owners and site admins manage all projects. Editors can create and publish content. Viewers
        are read-only.
      </p>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {actionError ? <p className="mt-4 text-sm text-red-700">{actionError}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="member-email" className="text-xs font-medium text-foreground">
            User email
          </label>
          <input
            id="member-email"
            type="email"
            placeholder="colleague@company.com"
            className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
        </div>
        <FieldSelect
          label="Role"
          value={inviteRole}
          onChange={(value) => setInviteRole(value as TeamRole)}
          options={(Object.keys(ROLE_LABELS) as TeamRole[])
            .filter((role) => role !== "owner")
            .map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
        />
        {ROLES_NEEDING_PROJECT.includes(inviteRole) ? (
          <FieldSelect
            label="Assigned site"
            value={inviteProjectId}
            onChange={setInviteProjectId}
            placeholder="Select site"
            options={projects.map((project) => ({
              value: String(project.id),
              label: project.name,
            }))}
          />
        ) : null}
        <div className="flex items-end">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            disabled={submitting}
            onClick={() => void handleAddMember()}
          >
            Add member
          </button>
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
                  <p className="text-sm font-medium">{member.name || member.email}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Joined {formatJoinedAt(member.joinedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FieldSelect
                    compact
                    label="Role"
                    value={role}
                    disabled={isOwner}
                    onChange={(nextRole) =>
                      void onUpdateMember(
                        member,
                        nextRole as TeamRole,
                        ROLES_NEEDING_PROJECT.includes(nextRole as TeamRole)
                          ? member.assignedProjectId
                          : null,
                      ).catch((err) => {
                        setActionError(
                          err instanceof Error ? err.message : "Failed to update member",
                        );
                      })
                    }
                    options={(Object.keys(ROLE_LABELS) as TeamRole[]).map((r) => ({
                      value: r,
                      label: ROLE_LABELS[r],
                      disabled: r === "owner",
                    }))}
                  />
                  {ROLES_NEEDING_PROJECT.includes(role) ? (
                    <FieldSelect
                      compact
                      label="Assigned site"
                      value={
                        member.assignedProjectId != null
                          ? String(member.assignedProjectId)
                          : ""
                      }
                      onChange={(projectId) =>
                        void onUpdateMember(
                          member,
                          role,
                          Number.parseInt(projectId, 10),
                        ).catch((err) => {
                          setActionError(
                            err instanceof Error ? err.message : "Failed to update member",
                          );
                        })
                      }
                      placeholder="Assign site"
                      options={projects.map((project) => ({
                        value: String(project.id),
                        label: project.name,
                      }))}
                    />
                  ) : null}
                  {!isOwner ? (
                    <button
                      type="button"
                      className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      onClick={() =>
                        void onRemoveMember(member).catch((err) => {
                          setActionError(
                            err instanceof Error ? err.message : "Failed to remove member",
                          );
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
