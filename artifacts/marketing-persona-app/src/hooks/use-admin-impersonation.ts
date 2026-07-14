"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

type ImpersonationKey = number | string;

export function useAdminImpersonation() {
  const router = useRouter();
  const { update } = useSession();
  const [impersonatingKey, setImpersonatingKey] = useState<ImpersonationKey | null>(null);

  async function startImpersonation(
    body: { userId: number } | { organizationId: number },
    key: ImpersonationKey,
    redirectTo = "/dashboard",
  ) {
    setImpersonatingKey(key);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to switch organization");
        return;
      }

      if (data.supportOrganizationId != null) {
        await update({
          supportOrganizationId: data.supportOrganizationId,
          supportOrganizationName: data.supportOrganizationName,
          companyId: data.companyId,
        });
      } else {
        await update({
          impersonateUserId: data.impersonateUserId,
          impersonator: data.impersonator,
        });
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Failed to switch organization");
    } finally {
      setImpersonatingKey(null);
    }
  }

  function impersonateUser(userId: number, redirectTo?: string) {
    return startImpersonation({ userId }, userId, redirectTo);
  }

  function impersonateOrganization(organizationId: number, redirectTo?: string) {
    return startImpersonation({ organizationId }, `org-${organizationId}`, redirectTo);
  }

  function isImpersonating(key: ImpersonationKey) {
    return impersonatingKey === key;
  }

  return {
    impersonatingKey,
    impersonateUser,
    impersonateOrganization,
    isImpersonating,
  };
}
