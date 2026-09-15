import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import { usersTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hostRasterFeaturedDataUri, isContentMediaHostConfigured } from "@workspace/media";

const MAX_AVATAR_DATA_URI_CHARS = 120_000;

const updateMeBody = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z
    .union([
      z.literal(""),
      z.null(),
      z
        .string()
        .max(MAX_AVATAR_DATA_URI_CHARS)
        .refine(
          (v) =>
            v.startsWith("data:image/jpeg;base64,") ||
            v.startsWith("data:image/jpg;base64,") ||
            v.startsWith("data:image/png;base64,") ||
            /^https:\/\//i.test(v),
        ),
    ])
    .optional(),
});

async function resolveAvatarForStorage(
  raw: string | null | undefined,
  userId: number,
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  if (raw === undefined) return { ok: true, url: null };
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { ok: true, url: null };
  if (/^https:\/\//i.test(trimmed)) return { ok: true, url: trimmed };
  if (!trimmed.startsWith("data:image/")) return { ok: false, error: "Invalid avatar image" };
  if (!isContentMediaHostConfigured()) {
    return { ok: false, error: "Avatar uploads need content media (R2) configured" };
  }
  const hosted = await hostRasterFeaturedDataUri(trimmed, {
    scope: `avatars/${userId}`,
    filenameBase: "avatar",
  });
  if (!hosted) return { ok: false, error: "Could not upload avatar to storage" };
  return { ok: true, url: hosted };
}

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
    const resolved = await resolveAvatarForStorage(parsed.data.avatarUrl, userId);
    if (!resolved.ok) {
      return withCors(request, Response.json({ error: resolved.error }, { status: 400 }));
    }
    updates.avatarUrl = resolved.url;
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
