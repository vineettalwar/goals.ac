import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isSiteAdmin, isSuperAdmin, type OrgMemberRow, type TeamRole } from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";

type MeResponse = {
  user?: {
    role: string;
  };
  orgRole?: string | null;
};

type MembersResponse = {
  members: OrgMemberRow[];
};

type TeamData = {
  orgRole: string | null;
  userRole: string | null;
  members: OrgMemberRow[];
};

async function fetchTeamData(): Promise<TeamData> {
  const me = await apiFetch<MeResponse>("/api/auth/me");
  const nextOrgRole = me.orgRole ?? null;
  const nextUserRole = me.user?.role ?? null;

  if (!isSuperAdmin(nextUserRole) && !isSiteAdmin(nextOrgRole)) {
    return { orgRole: nextOrgRole, userRole: nextUserRole, members: [] };
  }

  const data = await apiFetch<MembersResponse>("/api/organizations/members");
  return {
    orgRole: nextOrgRole,
    userRole: nextUserRole,
    members: data.members ?? [],
  };
}

export function useTeamData() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.team,
    queryFn: fetchTeamData,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const data = query.data;
  const orgRole = data?.orgRole ?? null;
  const userRole = data?.userRole ?? null;

  const canManageTeam = useMemo(
    () => isSuperAdmin(userRole) || isSiteAdmin(orgRole),
    [userRole, orgRole],
  );

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.team });
  }, [queryClient]);

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

  return {
    loading: query.isPending && !data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load team"
          : null,
    submitting,
    orgRole,
    userRole,
    canManageTeam,
    members: data?.members ?? [],
    reload,
    addMember,
    updateMember,
    removeMember,
  };
}
