import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { integrationConnectionsTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { encryptSecret } from "@workspace/security/encryption";
import { testGhostConnection } from "@/lib/publishers/ghost";
import { testWebhookConnection } from "@/lib/publishers/webhook";
import { z } from "zod";

const createSchema = z.discriminatedUnion("provider", [
  z.object({
    companyId: z.number(),
    provider: z.literal("ghost"),
    name: z.string().min(1),
    url: z.string().url(),
    secret: z.string().min(1), // admin API key, "id:secret"
    defaultStatus: z.enum(["draft", "published"]).default("draft"),
  }),
  z.object({
    companyId: z.number(),
    provider: z.literal("webhook"),
    name: z.string().min(1),
    url: z.string().url(),
    secret: z.string().min(1), // signing secret
    defaultStatus: z.enum(["draft", "publish"]).default("draft"),
  }),
]);

async function getOwnedCompanyId(userId: number, companyId: number): Promise<number | null> {
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(and(eq(companiesTable.id, companyId), eq(companiesTable.userId, userId)))
    .limit(1);
  return company?.id ?? null;
}

// Serialize a connection for the client without leaking the encrypted secret.
function toClientConnection(row: typeof integrationConnectionsTable.$inferSelect) {
  const { encryptedSecret: _encryptedSecret, ...rest } = row;
  return { ...rest, hasSecret: true };
}

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const companyIdParam = url.searchParams.get("companyId");
  if (!companyIdParam) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const companyId = await getOwnedCompanyId(userId!, parseInt(companyIdParam, 10));
  if (!companyId) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const connections = await db
    .select()
    .from(integrationConnectionsTable)
    .where(eq(integrationConnectionsTable.companyId, companyId));

  return NextResponse.json({ connections: connections.map(toClientConnection) });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const companyId = await getOwnedCompanyId(userId!, parsed.data.companyId);
  if (!companyId) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { provider, name, url: targetUrl, secret, defaultStatus } = parsed.data;

  const testResult =
    provider === "ghost"
      ? await testGhostConnection({ apiUrl: targetUrl, adminApiKey: secret })
      : await testWebhookConnection({ url: targetUrl, signingSecret: secret });

  const [connection] = await db
    .insert(integrationConnectionsTable)
    .values({
      companyId,
      provider,
      name,
      url: targetUrl,
      encryptedSecret: encryptSecret(secret),
      defaultStatus,
      lastTestedAt: new Date(),
      lastTestOk: testResult.ok,
    })
    .returning();

  return NextResponse.json({ connection: toClientConnection(connection), testResult }, { status: 201 });
}
