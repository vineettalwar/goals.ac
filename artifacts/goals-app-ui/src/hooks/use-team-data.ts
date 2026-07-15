import { useCallback, useEffect, useMemo, useState } from "react";
import { isSiteAdmin, isSuperAdmin, type OrgMemberRow, type TeamRole } from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";

type MeResponse = {
  user?: {
    role: string;
  };
  orgRole?: string | null;
};

type MembersResponse = {
  members: OrgMemberRow[];
};

export function useTeamData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMemberRow[]>([]);

  const canManageTeam = useMemo(
    () => isSuperAdmin(userRole) || isSiteAdmin(orgRole),
    [userRole, orgRole],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<MeResponse>("/api/auth/me");
      const nextOrgRole = me.orgRole ?? null;
      const nextUserRole = me.user?.role ?? null;
      setOrgRole(nextOrgRole);
      setUserRole(nextUserRole);

      if (!isSuperAdmin(nextUserRole) && !isSiteAdmin(nextOrgRole)) {
        setMembers([]);
        return;
      }

      const data = await apiFetch<MembersResponse>("/api/organizations/members");
      setMembers(data.members ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMember = useCallback(
    async (input: { email: string; role: TeamRole; assignedProjectId: number | null }) => {
      setSubmitting(true);
      try {
        await apiFetch("/api/organizations/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        await reload();
      } finally {
        setSubmitting(false);
      }
    },
    [reload],
  );

  const updateMember = useCallback(
    async (memberUserId: number, role: TeamRole, assignedProjectId: number | null) => {
      setSubmitting(true);
      try {
        await apiFetch(`/api/organizations/members/${memberUserId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, assignedProjectId }),
        });
        await reload();
      } finally {
        setSubmitting(false);
      }
    },
    [reload],
  );

  const removeMember = useCallback(
    async (memberUserId: number) => {
      setSubmitting(true);
      try {
        await apiFetch(`/api/organizations/members/${memberUserId}`, {
          method: "DELETE",
        });
        await reload();
      } finally {
        setSubmitting(false);
      }
    },
    [reload],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    error,
    submitting,
    orgRole,
    userRole,
    canManageTeam,
    members,
    reload,
    addMember,
    updateMember,
    removeMember,
  };
}
