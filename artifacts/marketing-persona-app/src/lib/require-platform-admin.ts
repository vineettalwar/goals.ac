import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/org-access";

/** Redirects to login or dashboard unless the user is a platform admin. */
export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = parseInt(session.user.id, 10);
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!isSuperAdmin(user?.role)) redirect("/dashboard");

  return { session, userId, role: user?.role ?? "user" };
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

  const userId = parseInt(session.user.id, 10);
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!isSuperAdmin(user?.role)) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { userId, error: null };
}
