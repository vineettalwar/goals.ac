import { getSession } from "@/auth";
import { NextResponse } from "next/server";
import { isSiteAdmin, isSuperAdmin } from "@/lib/org-access";
import type { OrgMemberRole } from "@/lib/org-access";

export async function requireSiteAdmin() {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      session: null,
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { role, orgRole } = session.user;
  if (!isSuperAdmin(role) && !isSiteAdmin(orgRole as OrgMemberRole | null)) {
    return {
      session: null,
      userId: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    session,
    userId: parseInt(session.user.id, 10),
    error: null,
  };
}
