import { eq } from "drizzle-orm";
import { z } from "zod";
import { resetAiProviderClient } from "@workspace/ai-providers";
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";

const patchBody = z.object({
  provider: z.enum(["gemini", "bedrock", "ollama", "openai", "anthropic"]),
  ollamaBaseUrl: z.string().trim().optional().nullable(),
  ollamaModel: z.string().trim().optional().nullable(),
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

export async function handleAiProvidersSettingsWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/ai-providers/settings" || request.method !== "PATCH") {
    return null;
  }

  const forbidden = await requireSiteAdmin(request, userId);
  if (forbidden) return forbidden;

  const orgSettings = await getOrgAiSettingsForUser(userId);
  if (!orgSettings) {
    return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
  }

  const parsed = patchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
    );
  }

  const { provider, ollamaBaseUrl, ollamaModel } = parsed.data;

  await db
    .update(organizationsTable)
    .set({
      aiProvider: provider,
      ollamaBaseUrl: provider === "ollama" ? (ollamaBaseUrl?.trim() || null) : null,
      ollamaModel: provider === "ollama" ? (ollamaModel?.trim() || null) : null,
    })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();

  const updated = await getOrgAiSettingsForUser(userId);
  return withCors(
    request,
    Response.json({
      activeProvider: provider,
      settings: {
        provider: updated?.aiProvider ?? provider,
        ollamaBaseUrl: updated?.ollamaBaseUrl ?? null,
        ollamaModel: updated?.ollamaModel ?? null,
      },
    }),
  );
}
