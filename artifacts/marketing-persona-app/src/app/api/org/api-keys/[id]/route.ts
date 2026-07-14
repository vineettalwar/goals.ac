import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/org-ai-settings";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  if (!orgSettings) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { id } = await params;
  const keyId = Number(id);
  if (!keyId) {
    return NextResponse.json({ error: "Invalid key id" }, { status: 400 });
  }

  const [updated] = await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeysTable.id, keyId),
        eq(apiKeysTable.organizationId, orgSettings.organizationId),
        isNull(apiKeysTable.revokedAt),
      ),
    )
    .returning({ id: apiKeysTable.id });

  if (!updated) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
