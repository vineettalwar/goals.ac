import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { resetAiProviderClient } from "@workspace/ai-providers";
import { z } from "zod";

const ApiKeyBody = z.object({
  key: z.string().min(10, "API key is too short"),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings?.encryptedAnthropicApiKey) {
    return NextResponse.json({ hasKey: false });
  }

  let lastFour = "••••";
  try {
    lastFour = decryptSecret(orgSettings.encryptedAnthropicApiKey).slice(-4);
  } catch {
    // keep placeholder if decryption fails
  }

  return NextResponse.json({ hasKey: true, lastFour });
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ApiKeyBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const encrypted = encryptSecret(parsed.data.key);
  await db
    .update(organizationsTable)
    .set({ encryptedAnthropicApiKey: encrypted })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();

  return NextResponse.json({ ok: true, hasKey: true, lastFour: parsed.data.key.slice(-4) });
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
    .set({ encryptedAnthropicApiKey: null })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  resetAiProviderClient();

  return NextResponse.json({ ok: true });
}
