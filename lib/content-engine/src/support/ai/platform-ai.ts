import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";
import { logger } from "../../core/logger";

function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function safeDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
}

export type PlatformAiProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "nvidia"
  | "ollama";

export type PlatformAiCredentials = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  source: "env" | "db";
};

const KEY_ENV: Record<Exclude<PlatformAiProviderId, "ollama">, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  nvidia: "NVIDIA_API_KEY",
};

const MODEL_ENV: Partial<Record<PlatformAiProviderId, string>> = {
  openrouter: "OPENROUTER_MODEL",
  groq: "GROQ_MODEL",
  nvidia: "NVIDIA_MODEL",
  ollama: "OLLAMA_MODEL",
};

/** Env wins over DB. Used when org has no BYOK for the selected provider. */
export async function loadPlatformAiCredentials(
  provider: PlatformAiProviderId,
): Promise<PlatformAiCredentials | null> {
  if (provider === "ollama") {
    const baseUrlEnv = envTrim("OLLAMA_BASE_URL");
    const modelEnv = envTrim("OLLAMA_MODEL");
    if (baseUrlEnv || modelEnv) {
      return { baseUrl: baseUrlEnv ?? undefined, model: modelEnv ?? undefined, source: "env" };
    }
    try {
      const [row] = await db
        .select({
          ollamaBaseUrl: platformSettingsTable.ollamaBaseUrl,
          ollamaModel: platformSettingsTable.ollamaModel,
        })
        .from(platformSettingsTable)
        .where(eq(platformSettingsTable.id, 1))
        .limit(1);
      const baseUrl = row?.ollamaBaseUrl?.trim() || undefined;
      const model = row?.ollamaModel?.trim() || undefined;
      if (!baseUrl && !model) return null;
      return { baseUrl, model, source: "db" };
    } catch (err) {
      logger.warn({ err }, "Failed to load platform Ollama settings");
      return null;
    }
  }

  const fromEnv =
    envTrim(KEY_ENV[provider]) ||
    (provider === "gemini" ? envTrim("AI_INTEGRATIONS_GEMINI_API_KEY") : null);
  const modelEnvName = MODEL_ENV[provider];
  const modelFromEnv = modelEnvName ? envTrim(modelEnvName) : null;
  if (fromEnv) {
    return { apiKey: fromEnv, model: modelFromEnv ?? undefined, source: "env" };
  }

  try {
    const [row] = await db
      .select({
        encryptedGeminiApiKey: platformSettingsTable.encryptedGeminiApiKey,
        encryptedOpenaiApiKey: platformSettingsTable.encryptedOpenaiApiKey,
        encryptedAnthropicApiKey: platformSettingsTable.encryptedAnthropicApiKey,
        encryptedOpenrouterApiKey: platformSettingsTable.encryptedOpenrouterApiKey,
        openrouterModel: platformSettingsTable.openrouterModel,
        encryptedGroqApiKey: platformSettingsTable.encryptedGroqApiKey,
        groqModel: platformSettingsTable.groqModel,
        encryptedNvidiaApiKey: platformSettingsTable.encryptedNvidiaApiKey,
        nvidiaModel: platformSettingsTable.nvidiaModel,
      })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1))
      .limit(1);

    const encrypted =
      provider === "gemini"
        ? row?.encryptedGeminiApiKey
        : provider === "openai"
          ? row?.encryptedOpenaiApiKey
          : provider === "anthropic"
            ? row?.encryptedAnthropicApiKey
            : provider === "openrouter"
              ? row?.encryptedOpenrouterApiKey
              : provider === "groq"
                ? row?.encryptedGroqApiKey
                : row?.encryptedNvidiaApiKey;

    const apiKey = safeDecrypt(encrypted);
    if (!apiKey) return null;

    const model =
      provider === "openrouter"
        ? row?.openrouterModel?.trim() || undefined
        : provider === "groq"
          ? row?.groqModel?.trim() || undefined
          : provider === "nvidia"
            ? row?.nvidiaModel?.trim() || undefined
            : undefined;

    return { apiKey, model, source: "db" };
  } catch (err) {
    logger.warn({ err, provider }, "Failed to load platform AI credentials");
    return null;
  }
}
