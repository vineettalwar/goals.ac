import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { encryptSecret } from "@workspace/security/encryption";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/org-ai-settings";
import {
  getOrgEncryptedDeeplApiKey,
  maskEncryptedDeeplApiKeyLastFour,
} from "@workspace/content-engine/support/deepl-credentials";

const DeeplCredentialBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  const encrypted = orgSettings
    ? await getOrgEncryptedDeeplApiKey(orgSettings.organizationId)
    : null;

  return NextResponse.json({
    configured: Boolean(encrypted),
    apiKeyLastFour: maskEncryptedDeeplApiKeyLastFour(encrypted),
    docsUrl: "https://www.deepl.com/pro-api",
  });
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DeeplCredentialBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const apiKey = parsed.data.apiKey.trim();

  await db
    .update(organizationsTable)
    .set({ encryptedDeeplApiKey: encryptSecret(apiKey) })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({
    ok: true,
    configured: true,
    apiKeyLastFour: apiKey.slice(-4),
  });
}

export async function DELETE() {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  await db
    .update(organizationsTable)
    .set({ encryptedDeeplApiKey: null })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({ ok: true });
}
