import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  avatarUrlInputSchema,
  resolveAvatarForStorage,
  resolveSessionImage,
} from "@/lib/auth/avatar";
import { initCfBindings } from "@/lib/init-cf-bindings";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: avatarUrlInputSchema.optional(),
});

export async function GET() {
  initCfBindings();
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user, orgSettings] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        avatarUrl: usersTable.avatarUrl,
        googleId: usersTable.googleId,
        passwordHash: usersTable.passwordHash,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId!))
      .limit(1)
      .then((rows) => rows[0]),
    getOrgAiSettingsForUser(userId!),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      image: resolveSessionImage(user.avatarUrl, user.email),
    },
    hasGeminiKey: Boolean(orgSettings?.encryptedGeminiKey),
    hasGoogleId: Boolean(user.googleId),
    hasPassword: Boolean(user.passwordHash),
  });
}

export async function PATCH(req: Request) {
  initCfBindings();
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const updates: { name?: string; avatarUrl?: string | null } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) {
    const resolved = await resolveAvatarForStorage(parsed.data.avatarUrl, userId!);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    updates.avatarUrl = resolved.url;
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId!))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      ...user,
      image: resolveSessionImage(user.avatarUrl, user.email),
    },
  });
}
