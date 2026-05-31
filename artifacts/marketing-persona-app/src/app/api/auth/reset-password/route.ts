import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { token, password } = parsed.data;

  try {
    const [user] = await db
      .select({ id: usersTable.id, passwordResetToken: usersTable.passwordResetToken, passwordResetExpires: usersTable.passwordResetExpires })
      .from(usersTable)
      .where(eq(usersTable.passwordResetToken, token))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .update(usersTable)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
