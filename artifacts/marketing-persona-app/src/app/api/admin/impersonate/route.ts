import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getOrgMembership,
  getUserForImpersonation,
  isSuperAdmin,
} from "@/lib/org-access";
import { logOrgAudit } from "@/lib/org-audit";

const ImpersonateBody = z.object({
  userId: z.number().int().positive(),
});

function clientIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

async function getAdminContext(session: Session) {
  const adminId = session.impersonation?.adminId
    ? parseInt(session.impersonation.adminId, 10)
    : parseInt(session.user.id, 10);

  const adminRole =
    session.impersonatorRole ??
    (
      await db
        .select({ role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, adminId))
        .limit(1)
    )[0]?.role;

  return { adminId, adminRole };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { adminId, adminRole } = await getAdminContext(session);
  if (!isSuperAdmin(adminRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ImpersonateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const target = await getUserForImpersonation(parsed.data.userId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isSuperAdmin(target.role)) {
    return NextResponse.json({ error: "Cannot impersonate platform admins" }, { status: 403 });
  }

  if (target.id === adminId) {
    return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
  }

  const membership = await getOrgMembership(target.id);
  if (membership) {
    await logOrgAudit({
      organizationId: membership.organizationId,
      actorUserId: adminId,
      action: "admin.impersonation_started",
      resourceType: "user",
      resourceId: target.id,
      metadata: { targetEmail: target.email },
      ip: clientIp(req),
    });
  }

  const [adminUser] = await db
    .select({ email: usersTable.email, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, adminId))
    .limit(1);

  return NextResponse.json({
    ok: true,
    impersonateUserId: String(target.id),
    impersonator: {
      id: String(adminId),
      email: adminUser?.email ?? session.impersonation?.adminEmail ?? session.user.email,
      name: adminUser?.name ?? session.impersonation?.adminName ?? session.user.name,
      role: adminRole ?? adminUser?.role ?? "user",
    },
    target: {
      id: String(target.id),
      email: target.email,
      name: target.name,
    },
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.impersonation) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

  const adminId = parseInt(session.impersonation.adminId, 10);
  const targetId = parseInt(session.user.id, 10);
  const membership = await getOrgMembership(targetId);

  if (membership) {
    await logOrgAudit({
      organizationId: membership.organizationId,
      actorUserId: adminId,
      action: "admin.impersonation_stopped",
      resourceType: "user",
      resourceId: targetId,
      metadata: { targetEmail: session.user.email },
      ip: clientIp(req),
    });
  }

  return NextResponse.json({ ok: true, stopImpersonation: true });
}
