import { eq } from "drizzle-orm";
import { z } from "zod";
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import type { EncryptedStockCredentialsMap } from "@workspace/db/schema-sqlite";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { getOrgEncryptedStockCredentials } from "@workspace/content-engine/support/integrations/stock-credentials";
import { encryptSecret } from "@workspace/security/encryption";
import {
  isStockProviderId,
  STOCK_PROVIDER_REGISTRY,
  testStockProviderConnection,
} from "@workspace/stock-images";

const stockCredentialBody = z.object({
  provider: z.string().refine(isStockProviderId, "Unknown stock provider"),
  apiKey: z.string().min(8, "API key is too short"),
});

const stockTestBody = z.object({
  provider: z.string().refine(isStockProviderId, "Unknown stock provider"),
  apiKey: z.string().min(8, "API key is too short"),
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

export async function handleAuthStockWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/auth/stock-credentials/test" && request.method === "POST") {
    const parsed = stockTestBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const result = await testStockProviderConnection(parsed.data.provider, parsed.data.apiKey);
    if (!result.ok) {
      return withCors(request, Response.json({ ok: false, error: result.error }));
    }
    return withCors(request, Response.json({ ok: true, note: result.note }));
  }

  if (path === "/api/auth/stock-credentials" && request.method === "PATCH") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const parsed = stockCredentialBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const { provider, apiKey } = parsed.data;
    const meta = STOCK_PROVIDER_REGISTRY[provider];
    if (!meta.byokAllowed) {
      return withCors(request, Response.json({ error: "BYOK is not supported for this provider" }, { status: 400 }));
    }

    const existing = (await getOrgEncryptedStockCredentials(orgSettings.organizationId)) ?? {};
    const next: EncryptedStockCredentialsMap = {
      ...existing,
      [provider]: encryptSecret(apiKey.trim()),
    };

    await db
      .update(organizationsTable)
      .set({ encryptedStockCredentials: next })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(
      request,
      Response.json({
        ok: true,
        provider,
        apiKeyLastFour: apiKey.trim().slice(-4),
        billing: meta.billing,
        searchImplemented: meta.searchImplemented,
      }),
    );
  }

  if (path === "/api/auth/stock-credentials" && request.method === "DELETE") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const provider = new URL(request.url).searchParams.get("provider") ?? "";
    if (!isStockProviderId(provider)) {
      return withCors(request, Response.json({ error: "Unknown stock provider" }, { status: 400 }));
    }

    const existing = (await getOrgEncryptedStockCredentials(orgSettings.organizationId)) ?? {};
    const next = { ...existing };
    delete next[provider];

    await db
      .update(organizationsTable)
      .set({
        encryptedStockCredentials: Object.keys(next).length > 0 ? next : null,
      })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(request, Response.json({ ok: true }));
  }

  return null;
}
