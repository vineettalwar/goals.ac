import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { z } from "zod";

const ApiKeyBody = z.object({
  key: z.string().min(10, "API key is too short"),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.encryptedGeminiKey) return NextResponse.json({ hasKey: false });

  let lastFour = "••••";
  try {
    lastFour = decryptSecret(user.encryptedGeminiKey).slice(-4);
  } catch {
    // keep placeholder if decryption fails
  }

  return NextResponse.json({ hasKey: true, lastFour });
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = ApiKeyBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const encrypted = encryptSecret(parsed.data.key);
  await db.update(usersTable).set({ encryptedGeminiKey: encrypted }).where(eq(usersTable.id, userId!));

  return NextResponse.json({ ok: true, hasKey: true, lastFour: parsed.data.key.slice(-4) });
}

export async function DELETE() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  await db.update(usersTable).set({ encryptedGeminiKey: null }).where(eq(usersTable.id, userId!));
  return NextResponse.json({ ok: true });
}
