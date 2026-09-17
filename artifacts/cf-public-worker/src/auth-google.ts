import { resolveGoogleOAuthCredentials } from "@workspace/platform-admin";
import { eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import { usersTable } from "@workspace/db/schema-sqlite";
import {
  buildSessionCookie,
  requestUsesSecureCookies,
  sessionPayloadFromUser,
} from "@workspace/cf-edge/session-cookie";

/**
 * Google OAuth sign-in for goals-app-ui (session JWT cookie).
 * Google client: Worker secrets overlay, else platform-admin encrypted credentials. AUTH_SECRET still required.
 */

const PROD_API_ORIGIN = "https://api.goals.ac";
const SUPER_ADMIN_EMAIL = "vineettalwar007@gmail.com";

type GoogleAuthEnv = {
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APP_URL?: string;
};

type OAuthStatePayload = {
  returnUrl: string;
  nonce: string;
};

type GoogleProfile = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

function requireSecret(env: GoogleAuthEnv): string | null {
  const secret = env.AUTH_SECRET?.trim();
  return secret || null;
}

/** Prefer `APP_URL` (wrangler var); last-resort prod default only if unset. */
function resolveAppOrigin(env: GoogleAuthEnv, request: Request): string {
  const configured = env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Invalid APP_URL — fall through.
    }
  }

  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:5174";
  }
  return "https://app.goals.ac";
}

function defaultSuccessUrl(env: GoogleAuthEnv, request: Request): string {
  return `${resolveAppOrigin(env, request)}/dashboard`;
}

function resolveGoogleRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${url.origin}/api/auth/google/callback`;
  }
  return `${PROD_API_ORIGIN}/api/auth/google/callback`;
}

function isAllowedAppOrigin(
  origin: string,
  request: Request,
  env: GoogleAuthEnv,
): boolean {
  if (origin === resolveAppOrigin(env, request)) return true;
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

function normalizeReturnUrl(
  raw: string | null,
  request: Request,
  env: GoogleAuthEnv,
): string {
  if (!raw?.trim()) return defaultSuccessUrl(env, request);
  try {
    const parsed = new URL(raw);
    if (isAllowedAppOrigin(parsed.origin, request, env)) {
      return parsed.toString();
    }
  } catch {
    // Invalid return URL — fall back to default.
  }
  return defaultSuccessUrl(env, request);
}

function loginErrorUrl(
  returnUrl: string,
  env: GoogleAuthEnv,
  request: Request,
  error = "oauth_failed",
): string {
  try {
    const origin = new URL(returnUrl).origin;
    return `${origin}/login?error=${error}`;
  } catch {
    return `${resolveAppOrigin(env, request)}/login?error=${error}`;
  }
}

/** Existing accounts only — invite/private-beta; no Google self-signup. */
export function googleSignInAllowed(opts: {
  byGoogleId: boolean;
  byEmail: boolean;
}): "ok_google_id" | "ok_email_link" | "deny" {
  if (opts.byGoogleId) return "ok_google_id";
  if (opts.byEmail) return "ok_email_link";
  return "deny";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signOAuthState(payload: OAuthStatePayload, secret: string): Promise<string> {
  const data = JSON.stringify(payload);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${toBase64Url(new TextEncoder().encode(data))}.${toBase64Url(new Uint8Array(sig))}`;
}

async function verifyOAuthState(
  state: string,
  secret: string,
): Promise<OAuthStatePayload | null> {
  const [dataPart, sigPart] = state.split(".");
  if (!dataPart || !sigPart) return null;

  const data = new TextDecoder().decode(fromBase64Url(dataPart));
  const key = await hmacKey(secret);
  const sigBytes = Uint8Array.from(fromBase64Url(sigPart));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(data),
  );
  if (!valid) return null;

  try {
    const parsed = JSON.parse(data) as OAuthStatePayload;
    if (typeof parsed.returnUrl !== "string" || typeof parsed.nonce !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function redirectResponse(location: string, cookie?: string): Response {
  const headers: Record<string, string> = { Location: location };
  if (cookie) headers["Set-Cookie"] = cookie;
  return new Response(null, { status: 302, headers });
}

export async function handleGoogleAuthStart(
  request: Request,
  env: GoogleAuthEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const google = await resolveGoogleOAuthCredentials(env);
  const clientId = google?.clientId;
  const clientSecret = google?.clientSecret;
  const configured = Boolean(clientId && clientSecret && requireSecret(env));

  // Login UI probes this before enabling the Google button.
  if (url.searchParams.get("probe") === "1") {
    return Response.json(
      { configured },
      { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!clientId) {
    return Response.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const secret = requireSecret(env);
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const returnUrl = normalizeReturnUrl(url.searchParams.get("returnUrl"), request, env);
  const state = await signOAuthState(
    { returnUrl, nonce: crypto.randomUUID() },
    secret,
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: resolveGoogleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  return redirectResponse(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function handleGoogleAuthCallback(
  request: Request,
  env: GoogleAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");

  const secret = requireSecret(env);
  const google = await resolveGoogleOAuthCredentials(env);
  const clientId = google?.clientId;
  const clientSecret = google?.clientSecret;

  const fallbackReturn = defaultSuccessUrl(env, request);

  if (!secret || !clientId || !clientSecret) {
    return redirectResponse(loginErrorUrl(fallbackReturn, env, request));
  }

  const state = stateParam ? await verifyOAuthState(stateParam, secret) : null;
  const returnUrl = state
    ? normalizeReturnUrl(state.returnUrl, request, env)
    : fallbackReturn;

  if (oauthError || !code) {
    return redirectResponse(loginErrorUrl(returnUrl, env, request));
  }

  if (!state) {
    return redirectResponse(loginErrorUrl(returnUrl, env, request));
  }

  const redirectUri = resolveGoogleRedirectUri(request);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
      console.error("[auth-google] token exchange failed", tokenData.error);
      return redirectResponse(loginErrorUrl(returnUrl, env, request));
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as GoogleProfile;

    if (!profile.id || !profile.email) {
      return redirectResponse(loginErrorUrl(returnUrl, env, request));
    }

    const email = profile.email.toLowerCase();
    let user: typeof usersTable.$inferSelect | undefined;

    const [byGoogleId] = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, profile.id))
      .limit(1);

    let byEmail: typeof usersTable.$inferSelect | undefined;
    if (!byGoogleId) {
      const [row] = await database
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);
      byEmail = row;
    }

    const decision = googleSignInAllowed({
      byGoogleId: Boolean(byGoogleId),
      byEmail: Boolean(byEmail),
    });

    if (decision === "deny") {
      return redirectResponse(loginErrorUrl(returnUrl, env, request, "no_account"));
    }

    if (decision === "ok_google_id" && byGoogleId) {
      user = byGoogleId;
      if (profile.picture && profile.picture !== byGoogleId.avatarUrl) {
        const [updated] = await database
          .update(usersTable)
          .set({ avatarUrl: profile.picture })
          .where(eq(usersTable.id, byGoogleId.id))
          .returning();
        user = updated;
      }
    } else if (byEmail) {
      const linkUpdates: { googleId?: string; avatarUrl?: string } = {};
      if (!byEmail.googleId) linkUpdates.googleId = profile.id;
      if (profile.picture) linkUpdates.avatarUrl = profile.picture;

      if (Object.keys(linkUpdates).length > 0) {
        const [updated] = await database
          .update(usersTable)
          .set(linkUpdates)
          .where(eq(usersTable.id, byEmail.id))
          .returning();
        user = updated;
      } else {
        user = byEmail;
      }
    }

    if (!user) {
      return redirectResponse(loginErrorUrl(returnUrl, env, request));
    }

    if (user.email === SUPER_ADMIN_EMAIL && user.role !== "super_admin") {
      const [promoted] = await database
        .update(usersTable)
        .set({ role: "super_admin" })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = promoted;
    }

    const secure = requestUsesSecureCookies(request);
    const cookie = await buildSessionCookie(sessionPayloadFromUser(user), secret, secure);

    return redirectResponse(returnUrl, cookie);
  } catch (err) {
    console.error("[auth-google] callback failed", err);
    return redirectResponse(loginErrorUrl(returnUrl, env, request));
  }
}
