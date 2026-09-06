import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { usersTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateMeBody = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});

export async function handleAuthMeWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/auth/me" || request.method !== "PATCH") {
    return null;
  }

  const parsed = updateMeBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
  }

  const updates: { name?: string; avatarUrl?: string | null } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) {
    updates.avatarUrl = parsed.data.avatarUrl === "" ? null : parsed.data.avatarUrl;
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    });

  if (!user) {
    return withCors(request, Response.json({ error: "User not found" }, { status: 404 }));
  }

  return withCors(request, Response.json({ user }));
}
