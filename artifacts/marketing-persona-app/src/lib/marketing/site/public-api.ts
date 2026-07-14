/** Resolve public API paths for static marketing (Pages) → api.goals.ac. */
export function publicApiUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  return path;
}
