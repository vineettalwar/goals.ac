import { NextResponse } from "next/server";
import { isWellFormedInviteToken } from "@workspace/security/invite-tokens";
import { INVITE_TOKEN_COOKIE, inviteTokenCookieOptions } from "@/app/api/invites/invite-cookie";

/**
 * Entry point for an invite link. The token arrives once, here, in the URL — this route's only
 * job is to move it into a short-lived httpOnly cookie and redirect to the clean `/accept-invite`
 * URL, so the token stops appearing in browser history, the Referer header of whatever the user
 * clicks next, and any server access log that records the request path.
 *
 * This is a Route Handler rather than a Server Component page because Next.js only allows
 * `cookies().set()` (or a redirect response's own `Set-Cookie`) from a Server Action or Route
 * Handler — a rendering Server Component cannot mutate cookies. Functionally this is the
 * server-verifies-then-redirects behavior the PRD describes for `/accept-invite/[token]`.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  if (!isWellFormedInviteToken(token)) {
    return NextResponse.redirect(new URL("/accept-invite?e=invalid", appUrl));
  }

  const response = NextResponse.redirect(new URL("/accept-invite", appUrl));
  response.cookies.set(INVITE_TOKEN_COOKIE, token, inviteTokenCookieOptions());
  return response;
}
