import { db } from "./db";
import { organizationsTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { requireSiteAdminAccess } from "@workspace/cf-edge/project-access";
import { logOrgAudit } from "@workspace/platform-admin";
import type { OrgSecuritySettings } from "@workspace/db/schema-sqlite";
import { z } from "zod";

const securitySchema = z.object({
  requireMfa: z.boolean().optional(),
  allowedIps: z.array(z.string()).optional(),
  maxSessionAgeHours: z.number().int().positive().max(720).optional(),
  allowCrossProjectEditors: z.boolean().optional(),
  ssoConfig: z
    .object({
      provider: z.string().optional(),
      issuer: z.string().optional(),
      clientId: z.string().optional(),
      domain: z.string().optional(),
    })
    .optional(),
});

function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function handleOrgSecurityWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/organizations/security" || request.method !== "PATCH") return null;

  const siteAdmin = await requireSiteAdminAccess(userId);
  if (!siteAdmin.ok) {
    return withCors(request, Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }));
  }

  const organizationId = siteAdmin.membership.organizationId;
  if (!organizationId) {
    return withCors(request, Response.json({ error: "No organization" }, { status: 400 }));
  }

  const body = await request.json().catch(() => null);
  const parsed = securitySchema.safeParse(body);
  if (!parsed.success) {
    return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
  }

  const next: OrgSecuritySettings = {
    ...(siteAdmin.membership.securitySettings ?? {}),
    ...parsed.data,
  };

  await db
    .update(organizationsTable)
    .set({ securitySettings: next })
    .where(eq(organizationsTable.id, organizationId));

  await logOrgAudit({
    organizationId,
    actorUserId: userId,
    action: "security.updated",
    metadata: parsed.data as Record<string, unknown>,
    ip: clientIp(request),
  });

  return withCors(request, Response.json({ securitySettings: next }));
}

export async function handleMfaRoutes(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;
  const { usersTable } = await import("@workspace/db/schema-sqlite");

  if (path === "/api/auth/mfa/setup" && method === "GET") {
    return null;
  }

  if (path === "/api/auth/mfa/setup" && method === "POST") {
    const {
      buildTotpAuthUri,
      encryptSecret,
      generateTotpSecret,
    } = await import("@workspace/security");
    const body = (await request.json().catch(() => ({}))) as { confirm?: boolean };
    const [user] = await db
      .select({ email: usersTable.email, mfaEnabled: usersTable.mfaEnabled })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) return withCors(request, Response.json({ error: "User not found" }, { status: 404 }));
    if (user.mfaEnabled && !body.confirm) {
      return withCors(request, Response.json({ error: "mfa_already_enabled" }, { status: 409 }));
    }
    const secret = generateTotpSecret();
    await db
      .update(usersTable)
      .set({ encryptedTotpSecret: encryptSecret(secret), mfaEnabled: false })
      .where(eq(usersTable.id, userId));
    return withCors(
      request,
      Response.json({ secret, authUri: buildTotpAuthUri(secret, String(user.email)) }),
    );
  }

  if (path === "/api/auth/mfa/confirm" && method === "POST") {
    const { decryptSecret, verifyTotpCode } = await import("@workspace/security");
    const body = (await request.json().catch(() => null)) as { code?: string } | null;
    if (!body?.code) {
      return withCors(request, Response.json({ error: "code required" }, { status: 400 }));
    }
    const [user] = await db
      .select({ encryptedTotpSecret: usersTable.encryptedTotpSecret })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user?.encryptedTotpSecret) {
      return withCors(request, Response.json({ error: "Setup MFA first" }, { status: 400 }));
    }
    const secret = decryptSecret(user.encryptedTotpSecret);
    if (!verifyTotpCode(secret, body.code)) {
      return withCors(request, Response.json({ error: "Invalid code" }, { status: 400 }));
    }
    await db.update(usersTable).set({ mfaEnabled: true }).where(eq(usersTable.id, userId));
    return withCors(request, Response.json({ ok: true }));
  }

  if (path === "/api/auth/mfa/verify" && method === "POST") {
    const { decryptSecret, verifyTotpCode } = await import("@workspace/security");
    const body = (await request.json().catch(() => null)) as { code?: string } | null;
    if (!body?.code) {
      return withCors(request, Response.json({ error: "code required" }, { status: 400 }));
    }
    const [user] = await db
      .select({ encryptedTotpSecret: usersTable.encryptedTotpSecret, mfaEnabled: usersTable.mfaEnabled })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user?.mfaEnabled || !user.encryptedTotpSecret) {
      return withCors(request, Response.json({ error: "MFA not enabled" }, { status: 400 }));
    }
    const secret = decryptSecret(user.encryptedTotpSecret);
    if (!verifyTotpCode(secret, body.code)) {
      return withCors(request, Response.json({ error: "Invalid code" }, { status: 400 }));
    }
    return withCors(request, Response.json({ ok: true, verified: true }));
  }

  return null;
}
