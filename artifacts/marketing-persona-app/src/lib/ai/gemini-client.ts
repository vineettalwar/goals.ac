import { GoogleGenAI } from "@google/genai";

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
