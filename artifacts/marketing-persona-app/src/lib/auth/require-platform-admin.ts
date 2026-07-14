import { getSession } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { isSuperAdmin } from "@/lib/org/org-access";

/** Role is stored in the JWT — same source the proxy middleware uses. */
function resolveAdminRole(session: Session) {
  if (session.impersonatorRole) {
    return session.impersonatorRole;
  }
  return session.user.role;
}

function resolveAdminUserId(session: Session) {
  if (session.impersonation?.adminId) {
    return parseInt(session.impersonation.adminId, 10);
  }
  return parseInt(session.user.id, 10);
}

/** Redirects to login or dashboard unless the user is a platform admin. */
export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const role = resolveAdminRole(session);
  if (!isSuperAdmin(role)) redirect("/dashboard");

  const userId = resolveAdminUserId(session);
  return { session, userId, role: role ?? "user" };
}

/** API variant — returns JSON errors instead of redirects. */
export async function requirePlatformAdminApi() {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = resolveAdminRole(session);
  if (!isSuperAdmin(role)) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const userId = resolveAdminUserId(session);
  return { userId, error: null };
}
