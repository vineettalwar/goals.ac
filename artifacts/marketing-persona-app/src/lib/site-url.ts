/** Canonical public site origin for sitemap, robots, and metadata. */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://goals.ac";
}
