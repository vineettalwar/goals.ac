import { useCallback, useEffect, useMemo, useState } from "react";
import { isSiteAdmin, isSuperAdmin, type OrgMemberRow } from "@workspace/app-shell";
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

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    error,
    orgRole,
    userRole,
    canManageTeam,
    members,
    reload,
  };
}
