import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret, verifyTotpCode } from "@workspace/security";
import { requireAuth } from "@/lib/auth/require-auth";

const VerifyBody = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth({ skipMfaCheck: true });
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = VerifyBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [user] = await db
    .select({
      mfaEnabled: usersTable.mfaEnabled,
      encryptedTotpSecret: usersTable.encryptedTotpSecret,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user?.mfaEnabled || !user.encryptedTotpSecret) {
    return NextResponse.json({ error: "mfa_not_enabled" }, { status: 400 });
  }

  const secret = decryptSecret(user.encryptedTotpSecret);
  if (!verifyTotpCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  return NextResponse.json({
    verified: true,
    message: "Call session.update({ mfaVerified: true }) on the client to unlock the session.",
  });
}
