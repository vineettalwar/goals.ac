const DEFAULT_APP_ORIGIN = "https://app.goals.ac";

export function defaultProjectIntegrationsUrl(projectId?: number | null): string {
  if (projectId != null && Number.isFinite(projectId)) {
    return `${DEFAULT_APP_ORIGIN}/projects/${projectId}/integrations/search`;
  }
  return `${DEFAULT_APP_ORIGIN}/projects`;
}

function isAllowedAppOrigin(origin: string, request: Request): boolean {
  if (origin === "https://app.goals.ac") return true;
  if (origin.endsWith(".goals-ac-app.pages.dev")) return true;

  const reqHost = new URL(request.url).hostname;
  if (reqHost === "localhost" || reqHost === "127.0.0.1") {
    try {
      const parsed = new URL(origin);
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }
  return false;
}

function appOriginForReturn(request: Request): string {
  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") return new URL(request.url).origin;
  return DEFAULT_APP_ORIGIN;
}

export function normalizeReturnUrl(
  raw: string | null,
  request: Request,
  projectId?: number | null,
): string {
  const fallback = defaultProjectIntegrationsUrl(projectId);
  if (!raw?.trim()) return fallback;
  try {
    const parsed = raw.startsWith("/") ? new URL(raw, appOriginForReturn(request)) : new URL(raw);
    if (isAllowedAppOrigin(parsed.origin, request)) {
      return parsed.toString();
    }
  } catch {
    // Invalid return URL — fall back to default.
  }
  return fallback;
}
