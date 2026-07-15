const DEFAULT_APP_ORIGIN = "https://app.goals.ac";

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

export function resolveAppOrigin(request: Request): string {
  const origin = request.headers.get("Origin")?.trim();
  if (origin && isAllowedAppOrigin(origin, request)) {
    return origin.replace(/\/+$/, "");
  }

  const referer = request.headers.get("Referer")?.trim();
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (isAllowedAppOrigin(parsed.origin, request)) {
        return parsed.origin;
      }
    } catch {
      // Fall through to default.
    }
  }

  return DEFAULT_APP_ORIGIN;
}

export function billingSettingsUrl(request: Request, query?: string): string {
  const base = `${resolveAppOrigin(request)}/settings?tab=billing`;
  return query ? `${base}&${query}` : base;
}
