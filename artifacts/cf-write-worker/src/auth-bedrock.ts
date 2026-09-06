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

const bedrockCredentialsBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
  model: z.string().trim().min(1, "Choose a Bedrock model"),
});

const bedrockModelOnlyBody = z.object({
  model: z.string().trim().min(1, "Choose a Bedrock model"),
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
  if (path === "/api/auth/bedrock-credentials/models" && request.method === "POST") {
    const body = z
      .object({ apiKey: z.string().min(16).optional() })
      .safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return withCors(
        request,
        Response.json({ error: body.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const apiKey = body.data.apiKey?.trim();
    const { getDecryptedBedrockCredentialsForUser } = await import(
      "@workspace/content-engine/support/ai/org-ai-settings"
    );
    const credentials = apiKey
      ? { apiKey }
      : await getDecryptedBedrockCredentialsForUser(userId);

    if (!credentials) {
      return withCors(
        request,
        Response.json(
          { error: "Paste a Bedrock API key to load models available for this account." },
          { status: 400 },
        ),
      );
    }

    try {
      const { listBedrockChatModels } = await import("@workspace/ai-providers/bedrock");
      const models = await listBedrockChatModels(credentials);
      return withCors(request, Response.json({ models }));
    } catch (err) {
      const { formatBedrockAuthError } = await import("@workspace/ai-providers/bedrock");
      return withCors(
        request,
        Response.json({ error: formatBedrockAuthError(err) }, { status: 502 }),
      );
    }
  }

  if (path === "/api/auth/bedrock-credentials/test" && request.method === "POST") {
    const parsed = bedrockCredentialsBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    try {
      const { testBedrockCredentials } = await import("@workspace/ai-providers/bedrock");
      await testBedrockCredentials({
        apiKey: parsed.data.apiKey.trim(),
        model: parsed.data.model.trim(),
      });
      return withCors(request, Response.json({ ok: true }));
    } catch (err) {
      const { formatBedrockAuthError } = await import("@workspace/ai-providers/bedrock");
      return withCors(
        request,
        Response.json({ ok: false, error: formatBedrockAuthError(err) }),
      );
    }
  }

  if (path === "/api/auth/bedrock-credentials" && request.method === "PATCH") {
    const forbidden = await requireSiteAdmin(request, userId);
    if (forbidden) return forbidden;

    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!orgSettings) {
      return withCors(request, Response.json({ error: "Organization not found" }, { status: 404 }));
    }

    const raw = await request.json().catch(() => null);
    const modelOnly = bedrockModelOnlyBody.safeParse(raw);
    const full = bedrockCredentialsBody.safeParse(raw);

    if (modelOnly.success && !(raw && typeof raw === "object" && "apiKey" in raw && (raw as { apiKey?: string }).apiKey)) {
      const model = modelOnly.data.model.trim();
      await db
        .update(organizationsTable)
        .set({ bedrockModel: model })
        .where(eq(organizationsTable.id, orgSettings.organizationId));
      return withCors(
        request,
        Response.json({
          ok: true,
          hasCredentials: Boolean(orgSettings.encryptedBedrockSecretAccessKey),
          model,
        }),
      );
    }

    if (!full.success) {
      return withCors(
        request,
        Response.json({ error: full.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
      );
    }

    const apiKey = full.data.apiKey.trim();
    const model = full.data.model.trim();

    await db
      .update(organizationsTable)
      .set({
        encryptedBedrockAccessKeyId: null,
        encryptedBedrockSecretAccessKey: encryptSecret(apiKey),
        encryptedBedrockSessionToken: null,
        bedrockRegion: null,
        bedrockModel: model,
      })
      .where(eq(organizationsTable.id, orgSettings.organizationId));

    return withCors(
      request,
      Response.json({
        ok: true,
        hasCredentials: true,
        accessKeyLastFour: apiKey.slice(-4),
        region: null,
        model,
        hasSessionToken: false,
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
