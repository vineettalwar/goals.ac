import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// next-auth v5 auth() middleware, augmented to inject x-pathname so Server Components
// can reliably read the current path without any client-side tricks.
export default auth((req: NextRequest & { auth: unknown }) => {
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers),
        "x-pathname": req.nextUrl.pathname,
      }),
    },
  });
  return response;
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|about|pricing|roadmap|seo-article|geo-audit|login|signup|forgot-password|reset-password).*)",
  ],
};
