import { getSession } from "@/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { assertOrgNotSuspended, getOrgMembership } from "@/lib/org/org-access";
import { assertIpAllowed, assertMfaCompliance } from "@/lib/org/org-security";

export async function requireAuth(options?: { skipMfaCheck?: boolean }) {
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

    const [user] = await db
      .select({ mfaEnabled: usersTable.mfaEnabled })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const mfaCheck = assertMfaCompliance({
      requireMfa: membership.securitySettings?.requireMfa,
      userMfaEnabled: Boolean(user?.mfaEnabled),
      sessionMfaVerified: Boolean(session.mfaVerified),
    });
    if (!options?.skipMfaCheck && !mfaCheck.ok) {
      return {
        session,
        userId,
        error: NextResponse.json({ error: mfaCheck.code, message: mfaCheck.error }, { status: 403 }),
      };
    }
  }

  return {
    session,
    userId,
    error: null,
  };
}
