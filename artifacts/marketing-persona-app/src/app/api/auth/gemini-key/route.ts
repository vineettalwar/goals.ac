import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { encryptSecret, decryptSecret } from "@workspace/security/encryption";
import { z } from "zod";

const schema = z.object({ key: z.string().min(1) });

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user?.encryptedGeminiKey) return NextResponse.json({ hasKey: false });

  let lastFour = "••••";
  try {
    lastFour = decryptSecret(user.encryptedGeminiKey).slice(-4);
  } catch {
    // keep placeholder
  }

  return NextResponse.json({ hasKey: true, lastFour });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "API key required" }, { status: 400 });

  const encryptedKey = encryptSecret(parsed.data.key);
  await db.update(usersTable).set({ encryptedGeminiKey: encryptedKey }).where(eq(usersTable.id, userId!));

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  await db.update(usersTable).set({ encryptedGeminiKey: null }).where(eq(usersTable.id, userId!));
  return NextResponse.json({ ok: true });
}
