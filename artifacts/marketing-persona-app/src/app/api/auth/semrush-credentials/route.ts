import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import {
  getOrgAiSettingsForUser,
  hasOrgSemrushCredentials,
} from "@workspace/content-engine/support/org-ai-settings";
import { SEMRUSH_DATABASES, isSemrushDatabase } from "@workspace/keyword-research-provider";
import { z } from "zod";

const SemrushCredentialsBody = z.object({
  apiKey: z.string().min(16, "API key is too short"),
  database: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isSemrushDatabase, "Unsupported Semrush regional database"),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!hasOrgSemrushCredentials(orgSettings)) {
    return NextResponse.json({
      hasCredentials: false,
      database: orgSettings?.semrushDatabase ?? "us",
    });
  }

  let apiKeyLastFour = "••••";
  try {
    if (orgSettings?.encryptedSemrushApiKey) {
      apiKeyLastFour = decryptSecret(orgSettings.encryptedSemrushApiKey).slice(-4);
    }
  } catch {
    // keep placeholder
  }

  return NextResponse.json({
    hasCredentials: true,
    apiKeyLastFour,
    database: orgSettings?.semrushDatabase ?? "us",
    supportedDatabases: SEMRUSH_DATABASES,
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
  const parsed = SemrushCredentialsBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { apiKey, database } = parsed.data;

  await db
    .update(organizationsTable)
    .set({
      encryptedSemrushApiKey: encryptSecret(apiKey),
      semrushDatabase: database.toLowerCase(),
    })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({
    ok: true,
    hasCredentials: true,
    apiKeyLastFour: apiKey.slice(-4),
    database: database.toLowerCase(),
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
      encryptedSemrushApiKey: null,
      semrushDatabase: "us",
    })
    .where(eq(organizationsTable.id, orgSettings.organizationId));

  return NextResponse.json({ ok: true });
}
