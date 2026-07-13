import { getSession } from "@/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { assertOrgNotSuspended, getOrgMembership } from "@/lib/org-access";
import { assertIpAllowed } from "@/lib/org-security";

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      session: null,
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userId = parseInt(session.user.id, 10);

  const suspended = await assertOrgNotSuspended(userId);
  if (!suspended.ok) {
    return {
      session,
      userId,
      error: NextResponse.json({ error: suspended.error }, { status: suspended.status }),
    };
  }

  const membership = await getOrgMembership(userId);
  if (membership) {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip");
    const ipCheck = assertIpAllowed(ip, membership.securitySettings);
    if (!ipCheck.ok) {
      return {
        session,
        userId,
        error: NextResponse.json({ error: ipCheck.error }, { status: 403 }),
      };
    }
  }

  return {
    session,
    userId,
    error: null,
  };
}
