import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { wordpressConnectionsTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { testWordPressConnection, publishToWordPress } from "@/lib/publishers/wordpress";
import { encryptSecret, decryptSecret } from "@/lib/encryption";
import { z } from "zod";

const testSchema = z.object({
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(1),
});

const saveSchema = z.object({
  companyId: z.number(),
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(1),
  defaultStatus: z.enum(["draft", "publish"]).default("draft"),
  defaultCategoryId: z.number().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "save") {
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const [company] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(and(eq(companiesTable.id, parsed.data.companyId), eq(companiesTable.userId, userId!)))
      .limit(1);

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const encryptedAppPassword = encryptSecret(parsed.data.appPassword);
    const testResult = await testWordPressConnection({
      siteUrl: parsed.data.siteUrl,
      username: parsed.data.username,
      appPassword: parsed.data.appPassword,
    });

    const values = {
      siteUrl: parsed.data.siteUrl,
      username: parsed.data.username,
      encryptedAppPassword,
      defaultStatus: parsed.data.defaultStatus,
      defaultCategoryId: parsed.data.defaultCategoryId ?? null,
      isVerified: testResult.ok,
      lastTestedAt: new Date(),
    };

    const [connection] = await db
      .insert(wordpressConnectionsTable)
      .values({ ...values, companyId: company.id })
      .onConflictDoUpdate({ target: wordpressConnectionsTable.companyId, set: values })
      .returning();

    return NextResponse.json({ connection, testResult });
  }

  // Default: just test credentials
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await testWordPressConnection(parsed.data);
  return NextResponse.json(result);
}
