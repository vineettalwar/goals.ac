/**
 * Cookie that carries an invite token from `/accept-invite/[token]` to the rest of the
 * accept-invite flow, so the secret stops living in the URL (and stops leaking via Referer
 * headers and server access logs) after the first hop.
 */
export const INVITE_TOKEN_COOKIE = "goals_invite_token";

/** 30 minutes — long enough to read the invite, sign in or sign up, and accept. */
export const INVITE_TOKEN_COOKIE_MAX_AGE_SECONDS = 30 * 60;

export function inviteTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: INVITE_TOKEN_COOKIE_MAX_AGE_SECONDS,
  };
}
