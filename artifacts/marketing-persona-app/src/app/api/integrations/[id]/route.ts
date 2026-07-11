import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { integrationConnectionsTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { encryptSecret, decryptSecret } from "@workspace/security/encryption";
import { testGhostConnection } from "@/lib/publishers/ghost";
import { testWebhookConnection } from "@/lib/publishers/webhook";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  secret: z.string().min(1).optional(),
  defaultStatus: z.string().min(1).optional(),
});

function toClientConnection(row: typeof integrationConnectionsTable.$inferSelect) {
  const { encryptedSecret: _encryptedSecret, ...rest } = row;
  return { ...rest, hasSecret: true };
}

async function getOwnedConnection(userId: number, connectionId: number) {
  const rows = await db
    .select({ connection: integrationConnectionsTable })
    .from(integrationConnectionsTable)
    .innerJoin(companiesTable, eq(companiesTable.id, integrationConnectionsTable.companyId))
    .where(and(eq(integrationConnectionsTable.id, connectionId), eq(companiesTable.userId, userId)))
    .limit(1);
  return rows[0]?.connection ?? null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = await getOwnedConnection(userId!, connectionId);
  if (!existing) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, url: targetUrl, secret, defaultStatus } = parsed.data;

  const updates: Partial<typeof integrationConnectionsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (targetUrl !== undefined) updates.url = targetUrl;
  if (defaultStatus !== undefined) updates.defaultStatus = defaultStatus;
  if (secret !== undefined) updates.encryptedSecret = encryptSecret(secret);

  // Re-verify credentials whenever the URL or secret changes.
  let testResult: { ok: boolean; error?: string } | undefined;
  if (secret !== undefined || targetUrl !== undefined) {
    const effectiveUrl = targetUrl ?? existing.url ?? "";
    const effectiveSecret = secret ?? decryptSecret(existing.encryptedSecret);

    testResult =
      existing.provider === "ghost"
        ? await testGhostConnection({ apiUrl: effectiveUrl, adminApiKey: effectiveSecret })
        : await testWebhookConnection({ url: effectiveUrl, signingSecret: effectiveSecret });

    updates.lastTestedAt = new Date();
    updates.lastTestOk = testResult.ok;
  }

  const [connection] = await db
    .update(integrationConnectionsTable)
    .set(updates)
    .where(eq(integrationConnectionsTable.id, connectionId))
    .returning();

  return NextResponse.json({ connection: toClientConnection(connection!), testResult });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = await getOwnedConnection(userId!, connectionId);
  if (!existing) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  await db.delete(integrationConnectionsTable).where(eq(integrationConnectionsTable.id, connectionId));

  return NextResponse.json({ ok: true });
}
