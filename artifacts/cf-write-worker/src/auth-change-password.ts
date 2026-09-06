import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { usersTable } from "@workspace/db/schema-sqlite";

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function handleAuthChangePassword(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/auth/change-password" || request.method !== "POST") {
    return null;
  }

  const parsed = changePasswordBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
    );
  }

  const [user] = await db
    .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.passwordHash) {
    return withCors(
      request,
      Response.json({ error: "Password change is not available for this account" }, { status: 400 }),
    );
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return withCors(request, Response.json({ error: "Current password is incorrect" }, { status: 400 }));
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

  return withCors(request, Response.json({ ok: true }));
}
