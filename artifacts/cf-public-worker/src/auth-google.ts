import { eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import { usersTable } from "@workspace/db/schema-sqlite";
import {
  buildSessionCookie,
  requestUsesSecureCookies,
} from "@workspace/cf-edge/session-cookie";

/**
 * Google OAuth sign-in for goals-app-ui (session JWT cookie).
 * Worker secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET.
 */

const PROD_API_ORIGIN = "https://api.goals.ac";
const DEFAULT_SUCCESS_URL = "https://app.goals.ac/dashboard";
const SUPER_ADMIN_EMAIL = "vineettalwar007@gmail.com";

type GoogleAuthEnv = {
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
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

function resolveGoogleRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${url.origin}/api/auth/google/callback`;
  }
  return `${PROD_API_ORIGIN}/api/auth/google/callback`;
}

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

function normalizeReturnUrl(raw: string | null, request: Request): string {
  if (!raw?.trim()) return DEFAULT_SUCCESS_URL;
  try {
    const parsed = new URL(raw);
    if (isAllowedAppOrigin(parsed.origin, request)) {
      return parsed.toString();
    }
  } catch {
    // Invalid return URL — fall back to default.
  }
  return DEFAULT_SUCCESS_URL;
}

function loginErrorUrl(returnUrl: string): string {
  try {
    const origin = new URL(returnUrl).origin;
    return `${origin}/login?error=oauth_failed`;
  } catch {
    return "https://app.goals.ac/login?error=oauth_failed";
  }
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
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return Response.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const secret = requireSecret(env);
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const returnUrl = normalizeReturnUrl(url.searchParams.get("returnUrl"), request);
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
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  const fallbackReturn = DEFAULT_SUCCESS_URL;

  if (!secret || !clientId || !clientSecret) {
    return redirectResponse(loginErrorUrl(fallbackReturn));
  }

  const state = stateParam ? await verifyOAuthState(stateParam, secret) : null;
  const returnUrl = state
    ? normalizeReturnUrl(state.returnUrl, request)
    : fallbackReturn;

  if (oauthError || !code) {
    return redirectResponse(loginErrorUrl(returnUrl));
  }

  if (!state) {
    return redirectResponse(loginErrorUrl(returnUrl));
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
      return redirectResponse(loginErrorUrl(returnUrl));
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as GoogleProfile;

    if (!profile.id || !profile.email) {
      return redirectResponse(loginErrorUrl(returnUrl));
    }

    const email = profile.email.toLowerCase();
    let user: typeof usersTable.$inferSelect | undefined;

    const [byGoogleId] = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, profile.id))
      .limit(1);

    if (byGoogleId) {
      user = byGoogleId;
      if (profile.picture && profile.picture !== byGoogleId.avatarUrl) {
        const [updated] = await database
          .update(usersTable)
          .set({ avatarUrl: profile.picture })
          .where(eq(usersTable.id, byGoogleId.id))
          .returning();
        user = updated;
      }
    } else {
      const [byEmail] = await database
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (byEmail) {
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
      } else {
        const [created] = await database
          .insert(usersTable)
          .values({
            email,
            name: profile.name?.trim() || email.split("@")[0] || "User",
            googleId: profile.id,
            avatarUrl: profile.picture ?? null,
            role: "user",
          })
          .returning();
        user = created;
      }
    }

    if (!user) {
      return redirectResponse(loginErrorUrl(returnUrl));
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
    const cookie = await buildSessionCookie(
      {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      secret,
      secure,
    );

    return redirectResponse(returnUrl, cookie);
  } catch (err) {
    console.error("[auth-google] callback failed", err);
    return redirectResponse(loginErrorUrl(returnUrl));
  }
}
