import { verifySessionClaims } from "@workspace/cf-edge/jwt";
import type { SearchPropertyProvider } from "@workspace/db/schema-sqlite";
import type { SearchOAuthStatePayload, SearchPropertyAuthEnv } from "./types";

const PROD_API_ORIGIN = "https://api.goals.ac";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

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

export function requireAuthSecret(env: SearchPropertyAuthEnv): string | null {
  const secret = env.AUTH_SECRET?.trim();
  return secret || null;
}

export function resolveCallbackPath(provider: SearchPropertyProvider): string {
  return provider === "google_search_console"
    ? "/api/auth/google-search-console/callback"
    : "/api/auth/bing-webmaster/callback";
}

export function resolveSearchPropertyRedirectUri(
  request: Request,
  provider: SearchPropertyProvider,
): string {
  const path = resolveCallbackPath(provider);
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${url.origin}${path}`;
  }
  return `${PROD_API_ORIGIN}${path}`;
}

export async function signSearchOAuthState(
  payload: Omit<SearchOAuthStatePayload, "exp" | "nonce">,
  secret: string,
): Promise<string> {
  const full: SearchOAuthStatePayload = {
    ...payload,
    exp: Date.now() + OAUTH_STATE_TTL_MS,
    nonce: crypto.randomUUID(),
  };
  const data = JSON.stringify(full);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${toBase64Url(new TextEncoder().encode(data))}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySearchOAuthState(
  state: string,
  secret: string,
): Promise<SearchOAuthStatePayload | null> {
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
    const parsed = JSON.parse(data) as SearchOAuthStatePayload;
    if (
      typeof parsed.projectId !== "number" ||
      typeof parsed.userId !== "number" ||
      typeof parsed.provider !== "string" ||
      typeof parsed.returnUrl !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.nonce !== "string"
    ) {
      return null;
    }
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export async function requireSessionUserId(
  request: Request,
  env: SearchPropertyAuthEnv,
): Promise<number | null> {
  const secret = requireAuthSecret(env);
  if (!secret) return null;
  const session = await verifySessionClaims(request, secret);
  if (!session?.id) return null;
  const userId = Number.parseInt(session.id, 10);
  return Number.isFinite(userId) ? userId : null;
}

export function redirectToIntegrations(
  returnUrl: string,
  provider: SearchPropertyProvider,
  status: string,
): Response {
  const param = provider === "google_search_console" ? "gsc" : "bing";
  const url = new URL(returnUrl);
  url.searchParams.set(param, status);
  if (!url.searchParams.has("tab")) {
    url.searchParams.set("tab", "search");
  }
  return redirectResponse(url.toString());
}
