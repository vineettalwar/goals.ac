import { eq } from "drizzle-orm";
import { z } from "zod";
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { encryptSecret } from "@workspace/security/encryption";
import { testDeeplConnection } from "@workspace/deepl";

const deeplCredentialBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
});

function isSuperAdmin(userRole: string | null | undefined): boolean {
  return userRole === "super_admin" || userRole === "admin";
}

function isSiteAdmin(orgRole: string | null | undefined): boolean {
  return orgRole === "site_admin" || orgRole === "owner";
}

async function requireSiteAdmin(
  request: Request,
  userId: number,
): Promise<Response | null> {
  const [userRow] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!userRow) {
    return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const [memberRow] = await db
    .select({ role: organizationMembersTable.role })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  if (!isSuperAdmin(userRow.role) && !isSiteAdmin(memberRow?.role)) {
    return withCors(request, Response.json({ error: "Forbidden" }, { status: 403 }));
  }

  return null;
}

export async function handleAuthDeeplWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/auth/deepl-credentials/test" && request.method === "POST") {
    const parsed = deeplCredentialBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const result = await testDeeplConnection(parsed.data.apiKey);
    if (!result.ok) {
      return withCors(request, Response.json({ ok: false, error: result.error }));
    }
    return withCors(request, Response.json({ ok: true, note: result.note }));
  }

  if (path === "/api/auth/deepl-credentials" && request.method === "PATCH") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const parsed = deeplCredentialBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const apiKey = parsed.data.apiKey.trim();
    await db
      .update(organizationsTable)
      .set({ encryptedDeeplApiKey: encryptSecret(apiKey) })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(
      request,
      Response.json({
        ok: true,
        configured: true,
        apiKeyLastFour: apiKey.slice(-4),
      }),
    );
  }

  if (path === "/api/auth/deepl-credentials" && request.method === "DELETE") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    await db
      .update(organizationsTable)
      .set({ encryptedDeeplApiKey: null })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(request, Response.json({ ok: true }));
  }

  return null;
}
