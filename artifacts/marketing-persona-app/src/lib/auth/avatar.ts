import { hostRasterFeaturedDataUri, isContentMediaHostConfigured } from "@workspace/media";
import { z } from "zod";

export { gravatarUrlForEmail, resolveSessionImage } from "./avatar-display";

const MAX_AVATAR_DATA_URI_CHARS = 120_000;

/** Client may send a resized JPEG/PNG data URI (upload) or keep an existing HTTPS URL. */
export const avatarUrlInputSchema = z.union([
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
      "Avatar must be an uploaded image or HTTPS URL",
    ),
]);

export type ResolveAvatarResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

/**
 * Uploads go to R2; `users.avatar_url` only stores the public HTTPS URL.
 * Empty clears. Existing https (e.g. Google) kept as-is.
 */
export async function resolveAvatarForStorage(
  raw: string | null | undefined,
  userId: number,
): Promise<ResolveAvatarResult> {
  if (raw === undefined) return { ok: true, url: null };
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { ok: true, url: null };
  if (/^https:\/\//i.test(trimmed)) return { ok: true, url: trimmed };
  if (!trimmed.startsWith("data:image/")) {
    return { ok: false, error: "Invalid avatar image" };
  }

  if (!isContentMediaHostConfigured()) {
    return { ok: false, error: "Avatar uploads need content media (R2) configured" };
  }

  const hosted = await hostRasterFeaturedDataUri(trimmed, {
    scope: `avatars/${userId}`,
    filenameBase: "avatar",
  });
  if (!hosted) {
    return { ok: false, error: "Could not upload avatar to storage" };
  }
  return { ok: true, url: hosted };
}
