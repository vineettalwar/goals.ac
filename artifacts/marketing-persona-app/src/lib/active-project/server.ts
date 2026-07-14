import { cache } from "react";
import { cookies } from "next/headers";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project/cookie";
import { listAccessibleProjectIds } from "@/lib/org/org-access";

export const resolveActiveProjectId = cache(
  async (userId: number, supportOrganizationId?: number | null): Promise<number | null> => {
    const accessibleIds = await listAccessibleProjectIds(userId, supportOrganizationId);
  if (accessibleIds.length === 0) return null;

  const cookieStore = await cookies();
  const stored = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;
  const storedId = stored ? Number.parseInt(stored, 10) : Number.NaN;

  if (!Number.isNaN(storedId) && accessibleIds.includes(storedId)) {
    return storedId;
  }

  return accessibleIds[0] ?? null;
  },
);
