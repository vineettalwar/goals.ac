import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  buildTotpAuthUri,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  verifyTotpCode,
} from "@workspace/security";
import { requireAuth } from "@/lib/auth/require-auth";
import { getOrgMembership } from "@/lib/org/org-access";

export async function GET() {
  const { userId, session, error } = await requireAuth({ skipMfaCheck: true });
  if (error) return error;

  const [user] = await db
    .select({
      mfaEnabled: usersTable.mfaEnabled,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  const membership = await getOrgMembership(userId!);

  return NextResponse.json({
    enabled: Boolean(user?.mfaEnabled),
    required: Boolean(membership?.securitySettings?.requireMfa),
    verified: Boolean(session?.mfaVerified),
    pendingSetup: Boolean(user?.email && !user.mfaEnabled),
  });
}

const SetupBody = z.object({
  confirm: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth({ skipMfaCheck: true });
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = SetupBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [user] = await db
    .select({ email: usersTable.email, mfaEnabled: usersTable.mfaEnabled })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.mfaEnabled && !parsed.data.confirm) {
    return NextResponse.json({ error: "mfa_already_enabled" }, { status: 409 });
  }

  const secret = generateTotpSecret();
  await db
    .update(usersTable)
    .set({
      encryptedTotpSecret: encryptSecret(secret),
      mfaEnabled: false,
    })
    .where(eq(usersTable.id, userId!));

  return NextResponse.json({
    secret,
    authUri: buildTotpAuthUri(secret, user.email),
  });
}
