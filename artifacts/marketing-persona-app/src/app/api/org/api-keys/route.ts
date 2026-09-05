import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { apiKeysTable, type ApiKeyScope } from "@workspace/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { generateApiKey } from "@workspace/content-engine/support/auth/api-key-auth";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";

const CreateBody = z.object({
  name: z.string().min(1).max(120),
  scopes: z
    .array(
      z.enum([
        "publish:write",
        "content:read",
        "render:preview",
        "content:generate",
        "image:generate",
      ]),
    )
    .min(1)
    .default(["render:preview"]),
  rateLimitPerHour: z.number().int().min(10).max(10000).optional(),
});

export async function GET() {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      scopes: apiKeysTable.scopes,
      rateLimitPerHour: apiKeysTable.rateLimitPerHour,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
    })
    .from(apiKeysTable)
    .where(
      and(
        eq(apiKeysTable.organizationId, orgSettings.organizationId),
        isNull(apiKeysTable.revokedAt),
      ),
    )
    .orderBy(desc(apiKeysTable.createdAt));

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { rawKey, prefix, hash } = generateApiKey();
  const scopes = parsed.data.scopes as ApiKeyScope[];

  const [row] = await db
    .insert(apiKeysTable)
    .values({
      organizationId: orgSettings.organizationId,
      createdByUserId: userId!,
      name: parsed.data.name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      rateLimitPerHour: parsed.data.rateLimitPerHour ?? 60,
    })
    .returning({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      scopes: apiKeysTable.scopes,
      rateLimitPerHour: apiKeysTable.rateLimitPerHour,
      createdAt: apiKeysTable.createdAt,
    });

  return NextResponse.json({
    key: row,
    rawKey,
    message: "Copy this key now — it will not be shown again.",
  });
}
