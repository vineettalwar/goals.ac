import type { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

let platformClient: GoogleGenAI | null = null;

export async function getPlatformGeminiClient(): Promise<GoogleGenAI | null> {
  if (platformClient) return platformClient;

  const { GoogleGenAI: GenAI } = await import("@google/genai");
  const integrationBaseUrl = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
  const integrationApiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
  const envKey = process.env["GEMINI_API_KEY"];

  if (integrationBaseUrl && integrationApiKey) {
    platformClient = new GenAI({
      apiKey: integrationApiKey,
      httpOptions: { apiVersion: "", baseUrl: integrationBaseUrl },
    });
    return platformClient;
  }

  if (envKey) {
    platformClient = new GenAI({ apiKey: envKey });
    return platformClient;
  }

  return null;
}

export async function createUserGeminiClient(userApiKey: string): Promise<GoogleGenAI> {
  const { GoogleGenAI: GenAI } = await import("@google/genai");
  return new GenAI({ apiKey: userApiKey });
}

export function isUserKeyError(err: unknown): boolean {
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

export async function getGeminiClientWithFallback(
  userApiKey: string | null | undefined,
): Promise<{ client: GoogleGenAI; usingUserKey: boolean } | null> {
  if (userApiKey) {
    try {
      const client = await createUserGeminiClient(userApiKey);
      return { client, usingUserKey: true };
    } catch (err) {
      logger.warn({ err }, "Failed to create user Gemini client, falling back to platform key");
    }
  }

  const client = await getPlatformGeminiClient();
  if (!client) return null;
  return { client, usingUserKey: false };
}
