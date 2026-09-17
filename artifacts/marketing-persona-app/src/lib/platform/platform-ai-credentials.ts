import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { encryptSecret } from "@workspace/security/encryption";
import { lastFour } from "@workspace/billing";
import { eq } from "drizzle-orm";
import { activeEnvVars, envTrim, fieldStatus, plainFieldStatus } from "./integration-secrets/shared";

export type PlatformAiKeyProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "nvidia";

export type PlatformAiKeyStatus = {
  managedByEnv: boolean;
  envVars: string[];
  apiKey: { configured: boolean; source: "db" | "env" | null; lastFour: string | null };
  model: { configured: boolean; value: string | null; source: "db" | "env" | null } | null;
  configured: boolean;
};

export type PlatformOllamaStatus = {
  managedByEnv: boolean;
  envVars: string[];
  baseUrl: { configured: boolean; value: string | null; source: "db" | "env" | null };
  model: { configured: boolean; value: string | null; source: "db" | "env" | null };
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

const PROVIDERS: readonly AiKeyProviderConfig[] = [
  {
    id: "gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    extraEnvVars: ["AI_INTEGRATIONS_GEMINI_API_KEY"],
    encryptedColumn: "encryptedGeminiApiKey",
  },
  { id: "openai", apiKeyEnv: "OPENAI_API_KEY", encryptedColumn: "encryptedOpenaiApiKey" },
  { id: "anthropic", apiKeyEnv: "ANTHROPIC_API_KEY", encryptedColumn: "encryptedAnthropicApiKey" },
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
];

const OLLAMA_ENV_VARS = ["OLLAMA_BASE_URL", "OLLAMA_MODEL"] as const;

export function isPlatformAiKeyManagedByEnv(id: PlatformAiKeyProviderId): boolean {
  const config = PROVIDERS.find((item) => item.id === id);
  if (!config) return false;
  const names = [config.apiKeyEnv, ...(config.extraEnvVars ?? []), config.modelEnv].filter(
    Boolean,
  ) as string[];
  return activeEnvVars(names).length > 0;
}

export function isOllamaManagedByEnv(): boolean {
  return activeEnvVars(OLLAMA_ENV_VARS).length > 0;
}

async function loadRow() {
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

function buildKeyStatus(
  row: Awaited<ReturnType<typeof loadRow>>,
  config: AiKeyProviderConfig,
): PlatformAiKeyStatus {
  const envNames = [config.apiKeyEnv, ...(config.extraEnvVars ?? []), config.modelEnv].filter(
    Boolean,
  ) as string[];
  let apiKey = fieldStatus(row?.[config.encryptedColumn] ?? null, config.apiKeyEnv);
  if (config.id === "gemini" && !apiKey.configured && envTrim("AI_INTEGRATIONS_GEMINI_API_KEY")) {
    apiKey = {
      configured: true,
      source: "env",
      lastFour: lastFour(envTrim("AI_INTEGRATIONS_GEMINI_API_KEY")),
    };
  }
  const model =
    config.modelEnv && config.modelColumn
      ? plainFieldStatus(row?.[config.modelColumn] ?? null, config.modelEnv)
      : null;
  return {
    managedByEnv: isPlatformAiKeyManagedByEnv(config.id),
    envVars: activeEnvVars(envNames),
    apiKey,
    model,
    configured: apiKey.configured,
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
  const row = await loadRow();
  const keyStatuses = Object.fromEntries(
    PROVIDERS.map((config) => [config.id, buildKeyStatus(row, config)]),
  ) as Record<PlatformAiKeyProviderId, PlatformAiKeyStatus>;
  const baseUrl = plainFieldStatus(row?.ollamaBaseUrl, "OLLAMA_BASE_URL");
  const model = plainFieldStatus(row?.ollamaModel, "OLLAMA_MODEL");
  return {
    ...keyStatuses,
    ollama: {
      managedByEnv: isOllamaManagedByEnv(),
      envVars: activeEnvVars(OLLAMA_ENV_VARS),
      baseUrl,
      model,
      configured: baseUrl.configured || model.configured,
    },
  };
}

export async function savePlatformAiKeyCredentials(input: {
  integration: PlatformAiKeyProviderId;
  apiKey?: string;
  model?: string | null;
  updatedBy: number;
}): Promise<void> {
  if (isPlatformAiKeyManagedByEnv(input.integration)) {
    throw new Error("AI provider credentials are managed via server environment variables");
  }
  const config = PROVIDERS.find((item) => item.id === input.integration);
  if (!config) throw new Error(`Unknown AI provider: ${input.integration}`);
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
    .onConflictDoUpdate({ target: platformSettingsTable.id, set: patch });
}

export async function clearStoredPlatformAiKeyCredentials(
  integration: PlatformAiKeyProviderId,
  updatedBy: number,
): Promise<void> {
  const config = PROVIDERS.find((item) => item.id === integration);
  await savePlatformAiKeyCredentials({
    integration,
    apiKey: "",
    model: config?.modelColumn ? null : undefined,
    updatedBy,
  });
}

export async function savePlatformOllamaCredentials(input: {
  baseUrl?: string | null;
  model?: string | null;
  updatedBy: number;
}): Promise<void> {
  if (isOllamaManagedByEnv()) {
    throw new Error("Ollama settings are managed via server environment variables");
  }
  if (input.baseUrl === undefined && input.model === undefined) {
    throw new Error("No Ollama fields to update");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };
  if (input.baseUrl !== undefined) patch.ollamaBaseUrl = input.baseUrl?.trim() || null;
  if (input.model !== undefined) patch.ollamaModel = input.model?.trim() || null;

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({ target: platformSettingsTable.id, set: patch });
}

export async function clearStoredPlatformOllamaCredentials(updatedBy: number): Promise<void> {
  await savePlatformOllamaCredentials({ baseUrl: null, model: null, updatedBy });
}
