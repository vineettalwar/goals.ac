import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { lastFour } from "@workspace/billing";
import { eq } from "drizzle-orm";
import {
  activeEnvVars,
  envTrim,
  type PlatformIntegrationId,
} from "./platform-integration-defs";

type IntegrationFieldStatus = {
  configured: boolean;
  source: "db" | "env" | null;
  lastFour: string | null;
};

export type PlatformAiKeyProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "nvidia";

export type PlatformAiPlainField = {
  configured: boolean;
  value: string | null;
  source: "db" | "env" | null;
};

export type PlatformAiKeyStatus = {
  managedByEnv: boolean;
  envVars: string[];
  apiKey: IntegrationFieldStatus;
  model: PlatformAiPlainField | null;
  configured: boolean;
};

export type PlatformOllamaStatus = {
  managedByEnv: boolean;
  envVars: string[];
  baseUrl: PlatformAiPlainField;
  model: PlatformAiPlainField;
  configured: boolean;
};

type AiKeyProviderConfig = {
  id: PlatformAiKeyProviderId;
  apiKeyEnv: string;
  extraEnvVars?: readonly string[];
  encryptedColumn:
    | "encryptedGeminiApiKey"
    | "encryptedOpenaiApiKey"
    | "encryptedAnthropicApiKey"
    | "encryptedOpenrouterApiKey"
    | "encryptedGroqApiKey"
    | "encryptedNvidiaApiKey";
  modelEnv?: string;
  modelColumn?: "openrouterModel" | "groqModel" | "nvidiaModel";
};

export const PLATFORM_AI_KEY_PROVIDERS: readonly AiKeyProviderConfig[] = [
  {
    id: "gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    extraEnvVars: ["AI_INTEGRATIONS_GEMINI_API_KEY"],
    encryptedColumn: "encryptedGeminiApiKey",
  },
  {
    id: "openai",
    apiKeyEnv: "OPENAI_API_KEY",
    encryptedColumn: "encryptedOpenaiApiKey",
  },
  {
    id: "anthropic",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    encryptedColumn: "encryptedAnthropicApiKey",
  },
  {
    id: "openrouter",
    apiKeyEnv: "OPENROUTER_API_KEY",
    encryptedColumn: "encryptedOpenrouterApiKey",
    modelEnv: "OPENROUTER_MODEL",
    modelColumn: "openrouterModel",
  },
  {
    id: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    encryptedColumn: "encryptedGroqApiKey",
    modelEnv: "GROQ_MODEL",
    modelColumn: "groqModel",
  },
  {
    id: "nvidia",
    apiKeyEnv: "NVIDIA_API_KEY",
    encryptedColumn: "encryptedNvidiaApiKey",
    modelEnv: "NVIDIA_MODEL",
    modelColumn: "nvidiaModel",
  },
] as const;

export const OLLAMA_ENV_VARS = ["OLLAMA_BASE_URL", "OLLAMA_MODEL"] as const;

export function isPlatformAiKeyManagedByEnv(id: PlatformAiKeyProviderId): boolean {
  const config = PLATFORM_AI_KEY_PROVIDERS.find((item) => item.id === id);
  if (!config) return false;
  const names = [config.apiKeyEnv, ...(config.extraEnvVars ?? []), config.modelEnv].filter(
    Boolean,
  ) as string[];
  return activeEnvVars(names).length > 0;
}

export function isOllamaManagedByEnv(): boolean {
  return activeEnvVars(OLLAMA_ENV_VARS).length > 0;
}

function fieldStatus(dbEncrypted: string | null | undefined, envName: string): IntegrationFieldStatus {
  const fromEnv = envTrim(envName);
  if (fromEnv) {
    return { configured: true, source: "env", lastFour: lastFour(fromEnv) };
  }
  if (!dbEncrypted) {
    return { configured: false, source: null, lastFour: null };
  }
  try {
    const fromDb = decryptSecret(dbEncrypted);
    if (fromDb) {
      return { configured: true, source: "db", lastFour: lastFour(fromDb) };
    }
  } catch {
    // ignore decrypt failures for status
  }
  return { configured: false, source: null, lastFour: null };
}

function plainFieldStatus(
  dbValue: string | null | undefined,
  envName: string,
): PlatformAiPlainField {
  const fromEnv = envTrim(envName);
  if (fromEnv) {
    return { configured: true, value: fromEnv, source: "env" };
  }
  const trimmedDb = dbValue?.trim();
  if (trimmedDb) {
    return { configured: true, value: trimmedDb, source: "db" };
  }
  return { configured: false, value: null, source: null };
}

type AiCredentialRow = {
  encryptedGeminiApiKey: string | null;
  encryptedOpenaiApiKey: string | null;
  encryptedAnthropicApiKey: string | null;
  encryptedOpenrouterApiKey: string | null;
  openrouterModel: string | null;
  encryptedGroqApiKey: string | null;
  groqModel: string | null;
  encryptedNvidiaApiKey: string | null;
  nvidiaModel: string | null;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
};

async function loadAiCredentialRow(): Promise<AiCredentialRow | null> {
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
      ollamaBaseUrl: platformSettingsTable.ollamaBaseUrl,
      ollamaModel: platformSettingsTable.ollamaModel,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);
  return row ?? null;
}

export function buildPlatformAiKeyStatus(
  row: AiCredentialRow | null,
  config: AiKeyProviderConfig,
): PlatformAiKeyStatus {
  const envNames = [config.apiKeyEnv, ...(config.extraEnvVars ?? []), config.modelEnv].filter(
    Boolean,
  ) as string[];
  const apiKey = fieldStatus(row?.[config.encryptedColumn] ?? null, config.apiKeyEnv);
  // Gemini: Replit/AI Integrations env also counts as configured
  const altConfigured =
    config.id === "gemini" ? Boolean(envTrim("AI_INTEGRATIONS_GEMINI_API_KEY")) : false;
  const model =
    config.modelEnv && config.modelColumn
      ? plainFieldStatus(row?.[config.modelColumn] ?? null, config.modelEnv)
      : null;
  return {
    managedByEnv: isPlatformAiKeyManagedByEnv(config.id),
    envVars: activeEnvVars(envNames),
    apiKey: altConfigured && !apiKey.configured
      ? {
          configured: true,
          source: "env",
          lastFour: lastFour(envTrim("AI_INTEGRATIONS_GEMINI_API_KEY")),
        }
      : apiKey,
    model,
    configured: apiKey.configured || altConfigured,
  };
}

export function buildPlatformOllamaStatus(row: AiCredentialRow | null): PlatformOllamaStatus {
  const baseUrl = plainFieldStatus(row?.ollamaBaseUrl, "OLLAMA_BASE_URL");
  const model = plainFieldStatus(row?.ollamaModel, "OLLAMA_MODEL");
  return {
    managedByEnv: isOllamaManagedByEnv(),
    envVars: activeEnvVars(OLLAMA_ENV_VARS),
    baseUrl,
    model,
    configured: baseUrl.configured || model.configured,
  };
}

export async function getAllPlatformAiProviderStatuses(): Promise<{
  gemini: PlatformAiKeyStatus;
  openai: PlatformAiKeyStatus;
  anthropic: PlatformAiKeyStatus;
  openrouter: PlatformAiKeyStatus;
  groq: PlatformAiKeyStatus;
  nvidia: PlatformAiKeyStatus;
  ollama: PlatformOllamaStatus;
}> {
  const row = await loadAiCredentialRow();
  const keyStatuses = Object.fromEntries(
    PLATFORM_AI_KEY_PROVIDERS.map((config) => [config.id, buildPlatformAiKeyStatus(row, config)]),
  ) as Record<PlatformAiKeyProviderId, PlatformAiKeyStatus>;
  return {
    ...keyStatuses,
    ollama: buildPlatformOllamaStatus(row),
  };
}

export type SavePlatformAiKeyInput = {
  integration: PlatformAiKeyProviderId;
  apiKey?: string;
  model?: string | null;
  updatedBy: number;
};

export async function savePlatformAiKeyCredentials(input: SavePlatformAiKeyInput): Promise<void> {
  if (isPlatformAiKeyManagedByEnv(input.integration)) {
    throw new Error("AI provider credentials are managed via server environment variables");
  }
  const config = PLATFORM_AI_KEY_PROVIDERS.find((item) => item.id === input.integration);
  if (!config) {
    throw new Error(`Unknown AI provider: ${input.integration}`);
  }
  if (input.apiKey === undefined && input.model === undefined) {
    throw new Error("No AI provider fields to update");
  }

  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.apiKey !== undefined) {
    patch[config.encryptedColumn] = input.apiKey.trim()
      ? encryptSecret(input.apiKey.trim())
      : null;
  }
  if (input.model !== undefined && config.modelColumn) {
    patch[config.modelColumn] = input.model?.trim() || null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });
}

export async function clearStoredPlatformAiKeyCredentials(
  integration: PlatformAiKeyProviderId,
  updatedBy: number,
): Promise<void> {
  const config = PLATFORM_AI_KEY_PROVIDERS.find((item) => item.id === integration);
  if (!config) throw new Error(`Unknown AI provider: ${integration}`);
  await savePlatformAiKeyCredentials({
    integration,
    apiKey: "",
    model: config.modelColumn ? null : undefined,
    updatedBy,
  });
}

export type SavePlatformOllamaInput = {
  baseUrl?: string | null;
  model?: string | null;
  updatedBy: number;
};

export async function savePlatformOllamaCredentials(input: SavePlatformOllamaInput): Promise<void> {
  if (isOllamaManagedByEnv()) {
    throw new Error("Ollama settings are managed via server environment variables");
  }
  if (input.baseUrl === undefined && input.model === undefined) {
    throw new Error("No Ollama fields to update");
  }

  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };
  if (input.baseUrl !== undefined) {
    patch.ollamaBaseUrl = input.baseUrl?.trim() || null;
  }
  if (input.model !== undefined) {
    patch.ollamaModel = input.model?.trim() || null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });
}

export async function clearStoredPlatformOllamaCredentials(updatedBy: number): Promise<void> {
  await savePlatformOllamaCredentials({ baseUrl: null, model: null, updatedBy });
}

export function isPlatformAiIntegrationId(
  id: string,
): id is PlatformAiKeyProviderId | "ollama" {
  return (
    id === "ollama" ||
    PLATFORM_AI_KEY_PROVIDERS.some((item) => item.id === id)
  );
}

export type PlatformAiResolvedCredentials = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  source: "env" | "db";
};

/** Env wins over DB. Used at runtime when org has no BYOK. */
export async function resolvePlatformAiCredentials(
  integration: PlatformAiKeyProviderId | "ollama",
): Promise<PlatformAiResolvedCredentials | null> {
  if (integration === "ollama") {
    const baseUrlEnv = envTrim("OLLAMA_BASE_URL");
    const modelEnv = envTrim("OLLAMA_MODEL");
    if (baseUrlEnv || modelEnv) {
      return {
        baseUrl: baseUrlEnv ?? undefined,
        model: modelEnv ?? undefined,
        source: "env",
      };
    }
    const row = await loadAiCredentialRow();
    const baseUrl = row?.ollamaBaseUrl?.trim() || undefined;
    const model = row?.ollamaModel?.trim() || undefined;
    if (!baseUrl && !model) return null;
    return { baseUrl, model, source: "db" };
  }

  const config = PLATFORM_AI_KEY_PROVIDERS.find((item) => item.id === integration);
  if (!config) return null;

  const fromEnv =
    envTrim(config.apiKeyEnv) ||
    (config.id === "gemini" ? envTrim("AI_INTEGRATIONS_GEMINI_API_KEY") : null);
  const modelFromEnv = config.modelEnv ? envTrim(config.modelEnv) : null;
  if (fromEnv) {
    return {
      apiKey: fromEnv,
      model: modelFromEnv ?? undefined,
      source: "env",
    };
  }

  const row = await loadAiCredentialRow();
  const encrypted = row?.[config.encryptedColumn];
  if (!encrypted) return null;
  try {
    const apiKey = decryptSecret(encrypted);
    if (!apiKey) return null;
    const model =
      config.modelColumn && row?.[config.modelColumn]?.trim()
        ? row[config.modelColumn]!.trim()
        : undefined;
    return { apiKey, model, source: "db" };
  } catch {
    return null;
  }
}

export function assertAiIntegrationId(id: PlatformIntegrationId): asserts id is PlatformAiKeyProviderId | "ollama" {
  if (!isPlatformAiIntegrationId(id)) {
    throw new Error(`Not an AI provider integration: ${id}`);
  }
}
