import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { integrationConnectionsTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { decryptSecret } from "@workspace/security/encryption";
import { testGhostConnection } from "@/lib/publishers/ghost";
import { testWebhookConnection } from "@/lib/publishers/webhook";

async function getOwnedConnection(userId: number, connectionId: number) {
  const rows = await db
    .select({ connection: integrationConnectionsTable })
    .from(integrationConnectionsTable)
    .innerJoin(companiesTable, eq(companiesTable.id, integrationConnectionsTable.companyId))
    .where(and(eq(integrationConnectionsTable.id, connectionId), eq(companiesTable.userId, userId)))
    .limit(1);
  return rows[0]?.connection ?? null;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const connection = await getOwnedConnection(userId!, connectionId);
  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const secret = decryptSecret(connection.encryptedSecret);
  const url = connection.url ?? "";

  const testResult =
    connection.provider === "ghost"
      ? await testGhostConnection({ apiUrl: url, adminApiKey: secret })
      : await testWebhookConnection({ url, signingSecret: secret });

  await db
    .update(integrationConnectionsTable)
    .set({ lastTestedAt: new Date(), lastTestOk: testResult.ok })
    .where(eq(integrationConnectionsTable.id, connectionId));

  return NextResponse.json(testResult);
}
