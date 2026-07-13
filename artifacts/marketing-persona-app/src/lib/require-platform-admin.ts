import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/org-access";

async function resolveAdminRole(session: Session) {
  if (session.impersonatorRole) {
    return session.impersonatorRole;
  }

  const userId = session.impersonation?.adminId
    ? parseInt(session.impersonation.adminId, 10)
    : parseInt(session.user.id, 10);

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return user?.role ?? session.user.role;
}

async function resolveAdminUserId(session: Session) {
  if (session.impersonation?.adminId) {
    return parseInt(session.impersonation.adminId, 10);
  }
  return parseInt(session.user.id, 10);
}

/** Redirects to login or dashboard unless the user is a platform admin. */
export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = await resolveAdminRole(session);
  if (!isSuperAdmin(role)) redirect("/dashboard");

  const userId = await resolveAdminUserId(session);
  return { session, userId, role: role ?? "user" };
}

/** API variant — returns JSON errors instead of redirects. */
export async function requirePlatformAdminApi() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = await resolveAdminRole(session);
  if (!isSuperAdmin(role)) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const userId = await resolveAdminUserId(session);
  return { userId, error: null };
}
