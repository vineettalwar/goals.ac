export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|about|pricing|roadmap|seo-article|geo-audit|login|signup|forgot-password|reset-password).*)",
  ],
};
