export function searchIntegrationsReturnPath(projectId: number): string {
  return `/projects/${projectId}/integrations/search`;
}

export function resolveSameOriginReturnUrl(
  origin: string,
  projectId: number,
  raw: string | null | undefined,
): string {
  const base = origin.replace(/\/+$/, "");
  const fallback = `${base}${searchIntegrationsReturnPath(projectId)}`;
  if (!raw?.trim()) return fallback;
  try {
    const parsed = raw.startsWith("/") ? new URL(raw, base) : new URL(raw);
    if (parsed.origin !== new URL(base).origin) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}
