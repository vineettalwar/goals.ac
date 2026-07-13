import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/reset-password",
  "/api/auth",
  "/_next",
  "/favicon",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth);

  if (isPublicPath(pathname)) {
    return NextResponse.next();
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
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin");

  if (isAppRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isLoggedIn &&
    pathname.startsWith("/projects") &&
    req.auth?.user?.orgRole === "member" &&
    req.auth.user.role !== "super_admin" &&
    req.auth.user.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
