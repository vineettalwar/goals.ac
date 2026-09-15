export function gravatarUrlFromSha256(hash: string, size = 128): string {
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

/** Browser: SHA-256 hex of trimmed lowercase email (Gravatar). */
export async function gravatarUrlForEmail(email: string, size = 128): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return gravatarUrlFromSha256(hash, size);
}
