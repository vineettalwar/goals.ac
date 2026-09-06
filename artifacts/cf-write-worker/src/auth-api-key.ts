import { eq } from "drizzle-orm";
import { z } from "zod";
import { createUserGeminiClient } from "@workspace/ai-providers";
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { encryptSecret } from "@workspace/security/encryption";

const apiKeyBody = z.object({
  key: z.string().min(10, "API key is too short"),
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

export async function handleAuthApiKeyWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/auth/api-key/test" && request.method === "POST") {
    const parsed = apiKeyBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    try {
      const client = await createUserGeminiClient(parsed.data.key);
      await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
        config: { maxOutputTokens: 16, thinkingConfig: { thinkingBudget: 0 } },
      });
      return withCors(request, Response.json({ ok: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return withCors(request, Response.json({ ok: false, error: msg }));
    }
  }

  if (path === "/api/auth/api-key" && request.method === "PATCH") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const parsed = apiKeyBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const encrypted = encryptSecret(parsed.data.key);
    await db
      .update(organizationsTable)
      .set({ encryptedGeminiKey: encrypted })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(
      request,
      Response.json({ ok: true, hasKey: true, lastFour: parsed.data.key.slice(-4) }),
    );
  }

  if (path === "/api/auth/api-key" && request.method === "DELETE") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    await db
      .update(organizationsTable)
      .set({ encryptedGeminiKey: null })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(request, Response.json({ ok: true }));
  }

  return null;
}
