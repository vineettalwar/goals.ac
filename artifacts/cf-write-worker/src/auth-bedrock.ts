import { eq } from "drizzle-orm";
import { z } from "zod";
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { encryptSecret } from "@workspace/security/encryption";

const bedrockCredentialsBody = z.object({
  accessKeyId: z.string().min(16, "Access key ID is too short"),
  secretAccessKey: z.string().min(16, "Secret access key is too short"),
  sessionToken: z.string().trim().optional().nullable(),
  region: z.string().trim().min(1, "Region is required"),
  model: z.string().trim().min(1, "Model is required"),
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

export async function handleAuthBedrockWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/auth/bedrock-credentials/test" && request.method === "POST") {
    const parsed = bedrockCredentialsBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const { accessKeyId, secretAccessKey, sessionToken, region, model } = parsed.data;

    try {
      const { BedrockClient } = await import("@workspace/ai-providers/bedrock");
      const client = await BedrockClient.create({
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken?.trim() || undefined,
        region,
        model,
      });
      await client.generate({
        prompt: "Reply with the single word: ok",
        maxOutputTokens: 16,
      });
      return withCors(request, Response.json({ ok: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return withCors(request, Response.json({ ok: false, error: msg }));
    }
  }

  if (path === "/api/auth/bedrock-credentials" && request.method === "PATCH") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const parsed = bedrockCredentialsBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const { accessKeyId, secretAccessKey, sessionToken, region, model } = parsed.data;
    const sessionTokenTrimmed = sessionToken?.trim();

    await db
      .update(organizationsTable)
      .set({
        encryptedBedrockAccessKeyId: encryptSecret(accessKeyId),
        encryptedBedrockSecretAccessKey: encryptSecret(secretAccessKey),
        encryptedBedrockSessionToken: sessionTokenTrimmed
          ? encryptSecret(sessionTokenTrimmed)
          : null,
        bedrockRegion: region,
        bedrockModel: model,
      })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(
      request,
      Response.json({
        ok: true,
        hasCredentials: true,
        accessKeyLastFour: accessKeyId.slice(-4),
        region,
        model,
        hasSessionToken: Boolean(sessionTokenTrimmed),
      }),
    );
  }

  if (path === "/api/auth/bedrock-credentials" && request.method === "DELETE") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    await db
      .update(organizationsTable)
      .set({
        encryptedBedrockAccessKeyId: null,
        encryptedBedrockSecretAccessKey: null,
        encryptedBedrockSessionToken: null,
        bedrockRegion: null,
        bedrockModel: null,
      })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(request, Response.json({ ok: true }));
  }

  return null;
}
