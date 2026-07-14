import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret, verifyTotpCode } from "@workspace/security";
import { requireAuth } from "@/lib/auth/require-auth";

const ConfirmBody = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth({ skipMfaCheck: true });
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = ConfirmBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [user] = await db
    .select({
      encryptedTotpSecret: usersTable.encryptedTotpSecret,
      mfaEnabled: usersTable.mfaEnabled,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user?.encryptedTotpSecret) {
    return NextResponse.json({ error: "mfa_not_configured" }, { status: 400 });
  }

  const secret = decryptSecret(user.encryptedTotpSecret);
  if (!verifyTotpCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  if (!user.mfaEnabled) {
    await db
      .update(usersTable)
      .set({ mfaEnabled: true })
      .where(eq(usersTable.id, userId!));
  }

  return NextResponse.json({ enabled: true });
}
