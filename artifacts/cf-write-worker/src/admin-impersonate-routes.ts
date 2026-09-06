import { withCors } from "@workspace/cf-edge/cors";
import {
  buildSessionCookie,
  requestUsesSecureCookies,
  type SessionTokenPayload,
} from "@workspace/cf-edge/session-cookie";
import type { SessionClaims } from "@workspace/cf-edge/jwt";
import { db } from "./db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  badRequest,
  clientIp,
  forbidden,
  getOrgMembership,
  jsonWithCookie,
  logOrgAudit,
  notFound,
} from "./admin-helpers";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const impersonateBodySchema = z.union([
  z.object({ userId: z.number().int().positive() }),
  z.object({ organizationId: z.number().int().positive() }),
]);

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleAdminImpersonateRoutes(
  request: Request,
  path: string,
  userId: number,
  userRole: string | null | undefined,
  session: SessionClaims,
  authSecret: string,
): Promise<Response | null> {
  const method = request.method;

  // ── POST /api/admin/impersonate ──────────────────────────────────────────
  if (path === "/api/admin/impersonate" && method === "POST") {
    if (userRole !== "super_admin") return forbidden(request);

    const body = await request.json().catch(() => null);
    const parsed = impersonateBodySchema.safeParse(body);
    if (!parsed.success) return badRequest(request, "Invalid request");

    const secure = requestUsesSecureCookies(request);
    const [adminUser] = await db
      .select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if ("organizationId" in parsed.data) {
      const organizationId = parsed.data.organizationId;

      const [org] = await db
        .select({
          ownerId: organizationsTable.ownerId,
          name: organizationsTable.name,
          companyId: organizationsTable.companyId,
        })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, organizationId))
        .limit(1);

      if (!org) return notFound(request, "Organization not found");

      const [target] = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
          role: usersTable.role,
        })
        .from(usersTable)
        .where(eq(usersTable.id, org.ownerId))
        .limit(1);

      if (!target || target.role === "super_admin" || target.role === "admin") {
        const supportPayload: SessionTokenPayload = {
          id: String(userId),
          email: adminUser?.email ?? session.email ?? "",
          name: adminUser?.name ?? session.name ?? null,
          role: userRole,
          supportOrganizationId: organizationId,
          supportOrganizationName: org.name,
          organizationId,
          orgRole: "owner",
        };
        const cookie = await buildSessionCookie(supportPayload, authSecret, secure);

        await logOrgAudit({
          organizationId,
          actorUserId: userId,
          action: "admin.org_support_started",
          resourceType: "organization",
          resourceId: organizationId,
          ip: clientIp(request),
        });

        return jsonWithCookie(
          request,
          {
            ok: true,
            supportOrganizationId: organizationId,
            supportOrganizationName: org.name,
            companyId: org.companyId,
          },
          cookie,
        );
      }

      const impersonationPayload: SessionTokenPayload = {
        id: String(target.id),
        email: target.email,
        name: target.name,
        role: target.role ?? "user",
        impersonatorId: String(userId),
        impersonatorRole: userRole,
        impersonatorEmail: adminUser?.email ?? session.email ?? null,
        impersonatorName: adminUser?.name ?? null,
      };

      const cookie = await buildSessionCookie(impersonationPayload, authSecret, secure);

      await logOrgAudit({
        organizationId,
        actorUserId: userId,
        action: "admin.impersonation_started",
        resourceType: "user",
        resourceId: target.id,
        metadata: { targetEmail: target.email, viaOrganizationId: organizationId },
        ip: clientIp(request),
      });

      return new Response(
        JSON.stringify({
          ok: true,
          impersonateUserId: String(target.id),
          impersonator: { id: String(userId), email: adminUser?.email, role: userRole },
          target: { id: String(target.id), email: target.email, name: target.name },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Set-Cookie": cookie,
          },
        },
      );
    }

    // userId-based impersonation
    const targetUserId = parsed.data.userId;

    const [target] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, targetUserId))
      .limit(1);

    if (!target) return notFound(request, "User not found");
    if (target.role === "super_admin" || target.role === "admin") return forbidden(request);
    if (target.id === userId) return badRequest(request, "Cannot impersonate yourself");

    const impersonationPayload: SessionTokenPayload = {
      id: String(target.id),
      email: target.email,
      name: target.name,
      role: target.role ?? "user",
      impersonatorId: String(userId),
      impersonatorRole: userRole,
      impersonatorEmail: adminUser?.email ?? session.email ?? null,
      impersonatorName: adminUser?.name ?? null,
    };

    const cookie = await buildSessionCookie(impersonationPayload, authSecret, secure);

    const membership = await getOrgMembership(target.id);

    if (membership) {
      await logOrgAudit({
        organizationId: membership.organizationId,
        actorUserId: userId,
        action: "admin.impersonation_started",
        resourceType: "user",
        resourceId: target.id,
        metadata: { targetEmail: target.email },
        ip: clientIp(request),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        impersonateUserId: String(target.id),
        impersonator: { id: String(userId), email: adminUser?.email, role: userRole },
        target: { id: String(target.id), email: target.email, name: target.name },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Set-Cookie": cookie,
        },
      },
    );
  }

  // ── DELETE /api/admin/impersonate ────────────────────────────────────────
  if (path === "/api/admin/impersonate" && method === "DELETE") {
    const { impersonatorId, supportOrganizationId, supportOrganizationName } = session;
    const secure = requestUsesSecureCookies(request);

    if (supportOrganizationId) {
      const adminId = impersonatorId ? Number.parseInt(impersonatorId, 10) : userId;
      await logOrgAudit({
        organizationId: supportOrganizationId,
        actorUserId: adminId,
        action: "admin.org_support_stopped",
        resourceType: "organization",
        resourceId: supportOrganizationId,
        ip: clientIp(request),
      });
      return withCors(request, Response.json({ ok: true, stopSupportOrganization: true }));
    }

    if (!impersonatorId) return badRequest(request, "Not impersonating");

    // Restore the original admin session
    const adminId = Number.parseInt(impersonatorId, 10);
    const [adminUser] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, adminId))
      .limit(1);

    if (!adminUser) return badRequest(request, "Admin user not found");

    const membership = await getOrgMembership(userId);

    if (membership) {
      await logOrgAudit({
        organizationId: membership.organizationId,
        actorUserId: adminId,
        action: "admin.impersonation_stopped",
        resourceType: "user",
        resourceId: userId,
        metadata: { targetEmail: session.email },
        ip: clientIp(request),
      });
    }

    const restoredPayload: SessionTokenPayload = {
      id: String(adminUser.id),
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role ?? session.impersonatorRole ?? "admin",
    };

    const cookie = await buildSessionCookie(restoredPayload, authSecret, secure);

    return new Response(JSON.stringify({ ok: true, stopImpersonation: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": cookie,
      },
    });
  }

  return null;
}
