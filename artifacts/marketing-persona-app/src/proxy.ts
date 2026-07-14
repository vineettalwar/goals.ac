import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/reset-password",
  "/accept-invite",
  "/api/auth",
  "/api/platform/status",
  "/api/invites",
  "/maintenance",
  "/_next",
  "/favicon",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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
  "/api/integrations",
  "/api/organizations/members",
  "/api/auth/api-key",
  "/api/auth/bedrock-credentials",
  "/api/ai-providers/settings",
];

const WRITE_APP_PREFIXES = [
  "/projects",
  "/settings",
  "/integrations",
  "/studio",
  "/content-piece",
  "/autopilot",
  "/onboarding",
];

function isWriteApiPath(pathname: string) {
  return WRITE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isWriteAppPath(pathname: string) {
  return WRITE_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function fetchPlatformStatus(origin: string) {
  try {
    const res = await fetch(`${origin}/api/platform/status`, {
      cache: "no-store",
    });
    if (!res.ok) return { platformEnabled: true };
    const body = (await res.json()) as { status?: string };
    return { platformEnabled: body.status !== "maintenance" };
  } catch {
    return { platformEnabled: true };
  }
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth);
  const userRole = req.auth?.user?.role;
  const impersonatorRole = req.auth?.impersonatorRole;
  const adminRole = impersonatorRole ?? userRole;
  const isImpersonating = Boolean(req.auth?.impersonation);
  const orgRole = normalizeOrgRole(req.auth?.user?.orgRole);

  if (isPublicPath(pathname)) {
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

  const platformStatus = await fetchPlatformStatus(req.nextUrl.origin);
  if (!platformStatus.platformEnabled && !isSuperAdmin(adminRole)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    if (!pathname.startsWith("/maintenance")) {
      return NextResponse.redirect(new URL("/maintenance", req.nextUrl.origin));
    }
  }

  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/autopilot") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/strategy") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/audit") ||
    pathname.startsWith("/research") ||
    pathname.startsWith("/growth-roadmaps") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/content-piece") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/onboarding");

  if (isAppRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && orgRole === "editor" && pathname.startsWith("/projects")) {
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
