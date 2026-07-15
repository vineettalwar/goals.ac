import { eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { verifySessionClaims } from "@workspace/cf-edge/jwt";
import { getAccessibleProject } from "@workspace/cf-edge/project-access";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  encryptCmsCredentials,
} from "@workspace/content-engine/support/publishing/cms-integrations";

export const PROD_API_ORIGIN = "https://api.goals.ac";
export const PROD_APP_ORIGIN = "https://app.goals.ac";

export type SocialOAuthEnv = {
  AUTH_SECRET?: string;
  GEMINI_KEY_ENCRYPTION_SECRET?: string;
};

export type SocialOAuthPlatform =
  | "linkedin"
  | "twitter"
  | "meta"
  | "bluesky"
  | "mastodon";

export type SocialOAuthStatePayload = {
  projectId: number;
  userId: number;
  platform: SocialOAuthPlatform;
  appOrigin: string;
  nonce: string;
  codeVerifier?: string;
  mastodonToken?: string;
  mastodonInstance?: string;
  mastodonClientId?: string;
};

const SOCIAL_OAUTH_PLATFORMS = new Set<SocialOAuthPlatform>([
  "linkedin",
  "twitter",
  "meta",
  "bluesky",
  "mastodon",
]);

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

export async function signSocialOAuthState(
  payload: SocialOAuthStatePayload,
  secret: string,
): Promise<string> {
  const data = JSON.stringify(payload);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${toBase64Url(new TextEncoder().encode(data))}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySocialOAuthState(
  state: string,
  secret: string,
): Promise<SocialOAuthStatePayload | null> {
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
    const parsed = JSON.parse(data) as SocialOAuthStatePayload;
    if (
      typeof parsed.projectId !== "number" ||
      typeof parsed.userId !== "number" ||
      !SOCIAL_OAUTH_PLATFORMS.has(parsed.platform) ||
      typeof parsed.appOrigin !== "string" ||
      typeof parsed.nonce !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export function apiOriginFromRequest(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return url.origin;
  }
  return PROD_API_ORIGIN;
}

export function resolveOAuthRedirectUri(request: Request, callbackPath: string): string {
  return `${apiOriginFromRequest(request)}${callbackPath}`;
}

function isAllowedAppOrigin(origin: string, request: Request): boolean {
  if (origin === PROD_APP_ORIGIN) return true;
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

export function normalizeAppOrigin(raw: string | null, request: Request): string {
  if (raw?.trim()) {
    try {
      const parsed = new URL(raw.trim());
      if (isAllowedAppOrigin(parsed.origin, request)) {
        return parsed.origin;
      }
    } catch {
      // Invalid origin — fall back below.
    }
  }
  return PROD_APP_ORIGIN;
}

export function appOriginFromRequest(request: Request): string {
  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      return normalizeAppOrigin(new URL(referer).origin, request);
    } catch {
      // Ignore invalid referer.
    }
  }
  return normalizeAppOrigin(null, request);
}

export function integrationsRedirectUrl(
  appOrigin: string,
  projectId: number,
  params: Record<string, string>,
): string {
  const qs = new URLSearchParams(params).toString();
  const base = `${appOrigin.replace(/\/+$/, "")}/projects/${projectId}/integrations`;
  return qs ? `${base}?${qs}` : base;
}

function requireAuthSecret(env: SocialOAuthEnv): string | null {
  const secret = env.AUTH_SECRET?.trim();
  return secret || null;
}

export async function requireSessionUserId(
  request: Request,
  env: SocialOAuthEnv,
  appOrigin: string,
): Promise<number | Response> {
  const secret = requireAuthSecret(env);
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const session = await verifySessionClaims(request, secret);
  if (!session?.id) {
    return redirectResponse(`${appOrigin.replace(/\/+$/, "")}/login`);
  }

  const userId = Number.parseInt(session.id, 10);
  if (!Number.isFinite(userId)) {
    return redirectResponse(`${appOrigin.replace(/\/+$/, "")}/login`);
  }

  return userId;
}

export function requireEncryptionConfigured(env: SocialOAuthEnv): Response | null {
  if (env.GEMINI_KEY_ENCRYPTION_SECRET?.trim()) return null;
  return Response.json(
    { error: "Credential encryption is not configured (GEMINI_KEY_ENCRYPTION_SECRET)" },
    { status: 503 },
  );
}

export async function saveSocialProjectCreds(
  projectId: number,
  userId: number,
  creds: CmsIntegrationCredentials,
  database: GoalsD1Database,
): Promise<void> {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) throw new Error("Project not found");
  await database
    .update(websiteProjectsTable)
    .set({ cmsIntegrations: encryptCmsCredentials(creds) })
    .where(eq(websiteProjectsTable.id, projectId));
}

export function loadExistingCreds(project: {
  cmsIntegrations: unknown;
}): CmsIntegrationCredentials {
  return decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
}

export function parseProjectIdParam(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const projectId = Number.parseInt(raw, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) return null;
  return projectId;
}
