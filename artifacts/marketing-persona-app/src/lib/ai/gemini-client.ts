import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/encryption";

let _client: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (_client) return _client;

  if (process.env.AI_INTEGRATIONS_GEMINI_BASE_URL && process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
    _client = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
  } else if (process.env.GEMINI_API_KEY) {
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else {
    throw new Error(
      "No Gemini API key found. Set AI_INTEGRATIONS_GEMINI_API_KEY or GEMINI_API_KEY."
    );
  }

  return _client;
}

export type AiClientSource = "user-key" | "replit-proxy" | "platform-key";

export function createAiClientFromKey(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

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

  const integrationBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const integrationApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (integrationBaseUrl && integrationApiKey) {
    return {
      client: new GoogleGenAI({
        apiKey: integrationApiKey,
        httpOptions: {
          apiVersion: "",
          baseUrl: integrationBaseUrl,
        },
      }),
      source: "replit-proxy",
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return { client: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), source: "platform-key" };
  }

  throw new Error("No Gemini API key found. Set user key, AI_INTEGRATIONS_GEMINI_API_KEY, or GEMINI_API_KEY.");
}
