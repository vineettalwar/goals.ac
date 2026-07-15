import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { encryptSecret, decryptSecret } from "@workspace/security/encryption";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { z } from "zod";

const schema = z.object({ key: z.string().min(1) });

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings?.encryptedGeminiKey) return NextResponse.json({ hasKey: false });

  let lastFour = "••••";
  try {
    lastFour = decryptSecret(orgSettings.encryptedGeminiKey).slice(-4);
  } catch {
    // keep placeholder
  }

  return NextResponse.json({ hasKey: true, lastFour });
}

export async function POST(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "API key required" }, { status: 400 });

  const encryptedKey = encryptSecret(parsed.data.key);
  await db
    .update(organizationsTable)
    .set({ encryptedGeminiKey: encryptedKey })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({ ok: true });
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
    .set({ encryptedGeminiKey: null })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({ ok: true });
}
