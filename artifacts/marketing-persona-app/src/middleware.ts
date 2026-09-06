import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import {
  isAppShellPath,
  isOrgIntegrationsAppPath,
  isPublicMarketingIntegrationsPath,
  isPublicPath,
} from "@/lib/middleware-paths";

/**
 * Edge middleware for auth/RBAC — required by @opennextjs/cloudflare (Node proxy.ts unsupported).
 * Next.js 16 deprecates middleware.ts in favor of proxy.ts; keep this file until OpenNext supports proxy.
 */

const { auth } = NextAuth(authConfig);

function isSuperAdmin(role: string | null | undefined) {
  return role === "super_admin" || role === "admin";
}

function normalizeOrgRole(role: string | null | undefined): string | null {
  if (!role) return null;
  if (role === "member") return "editor";
  return role;
}

const WRITE_API_PREFIXES = [
  "/api/website-projects",
  "/api/content-pieces",
  "/api/organizations/members",
  "/api/auth/api-key",
  "/api/auth/openai-credentials",
  "/api/auth/anthropic-credentials",
  "/api/auth/bedrock-credentials",
  "/api/auth/semrush-credentials",
  "/api/auth/stock-credentials",
  "/api/auth/deepl-credentials",
  "/api/ai-providers/settings",
];

const WRITE_APP_PREFIXES = [
  "/projects",
  "/settings",
  "/studio",
  "/content-piece",
  "/onboarding",
];

function isWriteApiPath(pathname: string) {
  return WRITE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isWriteAppPath(pathname: string) {
  if (isOrgIntegrationsAppPath(pathname)) return true;
  return WRITE_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Avoid a self-fetch on every nav/API — was the main soft-nav tax. */
const PLATFORM_STATUS_TTL_MS = 15_000;
let platformStatusCache: { platformEnabled: boolean; expiresAt: number } | null = null;

async function fetchPlatformStatus(origin: string) {
  const now = Date.now();
  if (platformStatusCache && now < platformStatusCache.expiresAt) {
    return { platformEnabled: platformStatusCache.platformEnabled };
  }

  try {
    const res = await fetch(`${origin}/api/platform/status`, {
      cache: "no-store",
    });
    if (!res.ok) return { platformEnabled: true };
    const body = (await res.json()) as { status?: string };
    const platformEnabled = body.status !== "maintenance";
    platformStatusCache = { platformEnabled, expiresAt: now + PLATFORM_STATUS_TTL_MS };
    return { platformEnabled };
  } catch {
    return { platformEnabled: true };
  }
}

function isRouterPrefetch(req: Request) {
  return (
    req.headers.get("Next-Router-Prefetch") === "1" ||
    req.headers.get("Purpose") === "prefetch" ||
    req.headers.get("Sec-Purpose") === "prefetch"
  );
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth);
  const userRole = req.auth?.user?.role;
  const impersonatorRole = req.auth?.impersonatorRole;
  const adminRole = impersonatorRole ?? userRole;
  const isImpersonating = Boolean(req.auth?.impersonation);
  const orgRole = normalizeOrgRole(req.auth?.user?.orgRole);

  if (isPublicPath(pathname) || isPublicMarketingIntegrationsPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isSuperAdmin(adminRole)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Super-admins bypass maintenance; prefeches fail open (real nav still checks).
  if (!isSuperAdmin(adminRole) && !isRouterPrefetch(req)) {
    const platformStatus = await fetchPlatformStatus(req.nextUrl.origin);
    if (!platformStatus.platformEnabled) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
      }
      if (!pathname.startsWith("/maintenance")) {
        return NextResponse.redirect(new URL("/maintenance", req.nextUrl.origin));
      }
    }
  }

  if (isAppShellPath(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && orgRole === "editor" && (pathname.startsWith("/projects") || pathname.startsWith("/partner"))) {
    if (!isSuperAdmin(userRole)) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
  }

  if (
    isImpersonating &&
    !isSuperAdmin(adminRole) &&
    pathname.startsWith("/api/") &&
    isWriteApiPath(pathname)
  ) {
    return NextResponse.json(
      { error: "Write operations are disabled while impersonating" },
      { status: 403 },
    );
  }

  if (isLoggedIn && orgRole === "viewer") {
    const blocked =
      (pathname.startsWith("/api/") && isWriteApiPath(pathname)) ||
      isWriteAppPath(pathname);
    if (blocked && !isSuperAdmin(userRole)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
