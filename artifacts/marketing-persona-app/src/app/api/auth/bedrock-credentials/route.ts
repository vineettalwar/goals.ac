import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import {
  getOrgAiSettingsForUser,
  hasOrgBedrockCredentials,
} from "@workspace/content-engine/support/ai/org-ai-settings";
import { resetAiProviderClient } from "@workspace/ai-providers";
import { z } from "zod";

const BedrockCredentialsBody = z.object({
  accessKeyId: z.string().min(16, "Access key ID is too short"),
  secretAccessKey: z.string().min(16, "Secret access key is too short"),
  sessionToken: z.string().trim().optional().nullable(),
  region: z.string().trim().min(1, "Region is required"),
  model: z.string().trim().min(1, "Model is required"),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!hasOrgBedrockCredentials(orgSettings)) {
    return NextResponse.json({ hasCredentials: false });
  }

  let accessKeyLastFour = "••••";
  try {
    if (orgSettings?.encryptedBedrockAccessKeyId) {
      accessKeyLastFour = decryptSecret(orgSettings.encryptedBedrockAccessKeyId).slice(-4);
    }
  } catch {
    // keep placeholder if decryption fails
  }

  return NextResponse.json({
    hasCredentials: true,
    accessKeyLastFour,
    region: orgSettings?.bedrockRegion ?? null,
    model: orgSettings?.bedrockModel ?? null,
    hasSessionToken: Boolean(orgSettings?.encryptedBedrockSessionToken),
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
  const parsed = BedrockCredentialsBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
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

  resetAiProviderClient();

  return NextResponse.json({
    ok: true,
    hasCredentials: true,
    accessKeyLastFour: accessKeyId.slice(-4),
    region,
    model,
    hasSessionToken: Boolean(sessionTokenTrimmed),
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
    .set({
      encryptedBedrockAccessKeyId: null,
      encryptedBedrockSecretAccessKey: null,
      encryptedBedrockSessionToken: null,
      bedrockRegion: null,
      bedrockModel: null,
    })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();

  return NextResponse.json({ ok: true });
}
