import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getOrgMembership,
  getOrganizationSupportContext,
  getUserForImpersonation,
  isSuperAdmin,
  resolveOrganizationImpersonationTarget,
} from "@/lib/org/org-access";
import { logOrgAudit } from "@/lib/org/org-audit";

const ImpersonateBody = z.union([
  z.object({ userId: z.number().int().positive() }),
  z.object({ organizationId: z.number().int().positive() }),
]);

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

  const organizationId =
    "organizationId" in parsed.data ? parsed.data.organizationId : undefined;

  if (organizationId != null) {
    const target = await resolveOrganizationImpersonationTarget(organizationId);

    if (
      target &&
      !isSuperAdmin(target.role) &&
      target.id !== adminId
    ) {
      const membership = await getOrgMembership(target.id);
      if (membership) {
        await logOrgAudit({
          organizationId: membership.organizationId,
          actorUserId: adminId,
          action: "admin.impersonation_started",
          resourceType: "user",
          resourceId: target.id,
          metadata: {
            targetEmail: target.email,
            viaOrganizationId: organizationId,
          },
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

    const orgContext = await getOrganizationSupportContext(organizationId);
    if (!orgContext) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    await logOrgAudit({
      organizationId: orgContext.id,
      actorUserId: adminId,
      action: "admin.org_support_started",
      resourceType: "organization",
      resourceId: orgContext.id,
      ip: clientIp(req),
    });

    return NextResponse.json({
      ok: true,
      supportOrganizationId: orgContext.id,
      supportOrganizationName: orgContext.name,
      companyId: orgContext.companyId,
    });
  }

  const target = await getUserForImpersonation(
    "userId" in parsed.data ? parsed.data.userId : 0,
  );

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

  const adminId = session.impersonation
    ? parseInt(session.impersonation.adminId, 10)
    : parseInt(session.user.id, 10);

  if (session.supportOrganization) {
    await logOrgAudit({
      organizationId: session.supportOrganization.id,
      actorUserId: adminId,
      action: "admin.org_support_stopped",
      resourceType: "organization",
      resourceId: session.supportOrganization.id,
      ip: clientIp(req),
    });

    return NextResponse.json({ ok: true, stopSupportOrganization: true });
  }

  if (!session.impersonation) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

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
