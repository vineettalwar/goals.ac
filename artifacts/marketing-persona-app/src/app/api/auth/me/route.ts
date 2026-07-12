import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      avatarUrl: usersTable.avatarUrl,
      encryptedGeminiKey: usersTable.encryptedGeminiKey,
      googleId: usersTable.googleId,
      passwordHash: usersTable.passwordHash,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    hasGeminiKey: Boolean(user.encryptedGeminiKey),
    hasGoogleId: Boolean(user.googleId),
    hasPassword: Boolean(user.passwordHash),
  });
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, userId!))
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });

  return NextResponse.json({ user });
}
