import { withCors } from "@workspace/cf-edge/cors";
import { requireSiteAdminAccess } from "@workspace/cf-edge/project-access";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";

export async function handleOrgSecurityRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/organizations/security" && request.method === "GET") {
    const siteAdmin = await requireSiteAdminAccess(userId);
    if (!siteAdmin.ok) {
      return withCors(request, Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }));
    }
    return withCors(
      request,
      Response.json({ securitySettings: siteAdmin.membership.securitySettings ?? {} }),
    );
  }

  if (path === "/api/auth/mfa/setup" && request.method === "GET") {
    const { getOrgMembership } = await import("@workspace/cf-edge/project-access");
    const [[user], membership] = await Promise.all([
      db
        .select({ mfaEnabled: usersTable.mfaEnabled, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1),
      getOrgMembership(userId),
    ]);

    return withCors(
      request,
      Response.json({
        enabled: Boolean(user?.mfaEnabled),
        required: Boolean(membership?.securitySettings?.requireMfa),
        verified: false,
        pendingSetup: Boolean(user?.email && !user.mfaEnabled),
      }),
    );
  }

  return null;
}
