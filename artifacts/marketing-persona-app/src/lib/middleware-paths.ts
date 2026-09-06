/** Path classification for Next middleware — keep sync with middleware.ts. */

const AUTH_PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/reset-password",
  "/accept-invite",
  "/api/auth",
  "/api/analytics/vitals",
  "/api/platform/status",
  "/api/invites",
  "/maintenance",
  "/_next",
  "/favicon",
] as const;

/** Public marketing integrations directory + CMS landers (not org AI/tools). */
const PUBLIC_INTEGRATION_LANDERS = new Set(["wordpress", "ghost", "shopify"]);

export function isOrgIntegrationsAppPath(pathname: string) {
  return (
    pathname === "/integrations/ai" ||
    pathname === "/integrations/tools" ||
    pathname.startsWith("/integrations/ai/") ||
    pathname.startsWith("/integrations/tools/")
  );
}

export function isAppShellPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/partner") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/strategy") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/audit") ||
    pathname.startsWith("/research") ||
    pathname.startsWith("/growth-roadmaps") ||
    isOrgIntegrationsAppPath(pathname) ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/content-piece") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/onboarding")
  );
}

export function isPublicMarketingIntegrationsPath(pathname: string) {
  if (pathname === "/integrations") return true;
  const match = /^\/integrations\/([^/]+)\/?$/.exec(pathname);
  return Boolean(match && PUBLIC_INTEGRATION_LANDERS.has(match[1]!));
}

/**
 * Skip platform-status self-fetch + RBAC for auth stubs and marketing.
 * App/admin stay gated; `/` already skipped maintenance — marketing matches that.
 */
export function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (AUTH_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) return false;
  if (isAppShellPath(pathname)) return false;
  return true;
}
