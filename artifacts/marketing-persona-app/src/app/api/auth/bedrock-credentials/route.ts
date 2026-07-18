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

const BedrockFullBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
  model: z.string().trim().min(1, "Choose a Bedrock model"),
});

const BedrockModelOnlyBody = z.object({
  model: z.string().trim().min(1, "Choose a Bedrock model"),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!hasOrgBedrockCredentials(orgSettings)) {
    return NextResponse.json({
      hasCredentials: false,
      model: orgSettings?.bedrockModel ?? null,
    });
  }

  let accessKeyLastFour = "••••";
  try {
    if (orgSettings?.encryptedBedrockSecretAccessKey) {
      accessKeyLastFour = decryptSecret(orgSettings.encryptedBedrockSecretAccessKey).slice(-4);
    } else if (orgSettings?.encryptedBedrockAccessKeyId) {
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
  const hasApiKey =
    body &&
    typeof body === "object" &&
    typeof (body as { apiKey?: unknown }).apiKey === "string" &&
    String((body as { apiKey: string }).apiKey).trim().length > 0;

  if (!hasApiKey) {
    const modelOnly = BedrockModelOnlyBody.safeParse(body);
    if (!modelOnly.success) {
      return NextResponse.json(
        { error: modelOnly.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const model = modelOnly.data.model.trim();
    await db
      .update(organizationsTable)
      .set({ bedrockModel: model })
      .where(eq(organizationsTable.id, orgSettings.organizationId));
    resetAiProviderClient();
    return NextResponse.json({
      ok: true,
      hasCredentials: hasOrgBedrockCredentials(orgSettings),
      model,
    });
  }

  const full = BedrockFullBody.safeParse(body);
  if (!full.success) {
    return NextResponse.json(
      { error: full.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
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

  resetAiProviderClient();

  return NextResponse.json({
    ok: true,
    hasCredentials: true,
    accessKeyLastFour: apiKey.slice(-4),
    region: null,
    model,
    hasSessionToken: false,
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
