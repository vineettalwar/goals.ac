import { GoogleGenAI } from "@google/genai";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";

export type AiClientSource = "user-key" | "replit-proxy" | "platform-key";

let _platformClient: GoogleGenAI | null = null;

function buildPlatformClient(): GoogleGenAI | null {
  const integrationBaseUrl = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
  const integrationApiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
  if (integrationBaseUrl && integrationApiKey) {
    return new GoogleGenAI({
      apiKey: integrationApiKey,
      httpOptions: { apiVersion: "", baseUrl: integrationBaseUrl },
    });
  }
  const envKey = process.env["GEMINI_API_KEY"];
  if (envKey) {
    return new GoogleGenAI({ apiKey: envKey });
  }
  return null;
}

/** Platform credentials only (Replit AI proxy, then env key). Returns null when neither is configured. */
export async function getPlatformGeminiClient(): Promise<GoogleGenAI | null> {
  if (_platformClient) return _platformClient;
  _platformClient = buildPlatformClient();
  return _platformClient;
}

/**
 * Platform credentials only; throws when none are configured.
 * @deprecated Use `getAiProviderClient()` or `resolveAiClient()` from `@workspace/ai-providers/resolve-client`.
 */
export function getAiClient(): GoogleGenAI {
  if (_platformClient) return _platformClient;
  _platformClient = buildPlatformClient();
  if (!_platformClient) {
    throw new Error("No Gemini API key found. Set AI_INTEGRATIONS_GEMINI_API_KEY or GEMINI_API_KEY.");
  }
  return _platformClient;
}

export function createAiClientFromKey(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export async function createUserGeminiClient(userApiKey: string): Promise<GoogleGenAI> {
  return new GoogleGenAI({ apiKey: userApiKey });
}

/** True when an error from Gemini indicates the *user's* BYOK key is bad or exhausted. */
export function isUserKeyError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status = typeof e["status"] === "number" ? e["status"] : typeof e["code"] === "number" ? e["code"] : null;
    if (status === 401 || status === 403 || status === 429) return true;
    const errCode = typeof e["errorCode"] === "string" ? (e["errorCode"] as string).toUpperCase() : "";
    if (errCode === "API_KEY_INVALID" || errCode === "PERMISSION_DENIED" || errCode === "RESOURCE_EXHAUSTED") return true;
  }
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("api_key_invalid") ||
    msg.includes("permission_denied") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("429") ||
    msg.includes("invalid api key") ||
    msg.includes("api key not valid")
  );
}

/**
 * BYOK resolution by user id: encrypted user key → Replit proxy → platform env key.
 * @deprecated Use `resolveAiClientForUser()` from `@workspace/content-engine/support/resolve-ai-client-for-user`.
 */
export async function getAiClientForUser(userId: number): Promise<{ client: GoogleGenAI; source: AiClientSource }> {
  const [user] = await db
    .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (user?.encryptedGeminiKey) {
    try {
      const key = decryptSecret(user.encryptedGeminiKey);
      return { client: createAiClientFromKey(key), source: "user-key" };
    } catch {
      // If key decrypt fails, silently fall back to platform credentials.
    }
  }

  const integrationBaseUrl = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
  const integrationApiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
  if (integrationBaseUrl && integrationApiKey) {
    return {
      client: new GoogleGenAI({
        apiKey: integrationApiKey,
        httpOptions: { apiVersion: "", baseUrl: integrationBaseUrl },
      }),
      source: "replit-proxy",
    };
  }

  const envKey = process.env["GEMINI_API_KEY"];
  if (envKey) {
    return { client: new GoogleGenAI({ apiKey: envKey }), source: "platform-key" };
  }

  throw new Error("No Gemini API key found. Set user key, AI_INTEGRATIONS_GEMINI_API_KEY, or GEMINI_API_KEY.");
}

/** BYOK resolution from an already-decrypted key, falling back to platform credentials. */
export async function getGeminiClientWithFallback(
  userApiKey: string | null | undefined,
): Promise<{ client: GoogleGenAI; usingUserKey: boolean } | null> {
  if (userApiKey) {
    try {
      const client = await createUserGeminiClient(userApiKey);
      return { client, usingUserKey: true };
    } catch {
      // Fall back to platform credentials below.
    }
  }

  const client = await getPlatformGeminiClient();
  if (!client) return null;
  return { client, usingUserKey: false };
}
