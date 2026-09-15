import { createHash } from "node:crypto";

function gravatarUrlFromSha256(hash: string, size = 128): string {
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

export function gravatarUrlForEmail(email: string, size = 128): string {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return gravatarUrlFromSha256(hash, size);
}

/** Account HTTPS avatar (R2 / Google), else Gravatar — short URL safe for the session cookie. */
export function resolveSessionImage(
  avatarUrl: string | null | undefined,
  email: string | null | undefined,
): string | undefined {
  const raw = avatarUrl?.trim();
  if (raw && /^https:\/\//i.test(raw)) return raw;
  if (email?.trim()) return gravatarUrlForEmail(email);
  return undefined;
}
