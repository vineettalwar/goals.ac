import { db } from "@workspace/db";
import { organizationMembersTable, organizationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";
import type { AiProviderOptions, BedrockCredentialOptions } from "@workspace/ai-providers";
import { logger } from "../logger";

export interface OrgAiSettings {
  organizationId: number;
  encryptedGeminiKey: string | null;
  encryptedBedrockAccessKeyId: string | null;
  encryptedBedrockSecretAccessKey: string | null;
  encryptedBedrockSessionToken: string | null;
  bedrockRegion: string | null;
  bedrockModel: string | null;
  aiProvider: string | null;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
  encryptedSemrushApiKey: string | null;
  semrushDatabase: string | null;
}

const SELECTABLE_PROVIDERS = new Set(["gemini", "bedrock", "ollama"]);

function normalizeProvider(provider: string | null | undefined): "gemini" | "bedrock" | "ollama" | null {
  if (provider && SELECTABLE_PROVIDERS.has(provider)) {
    return provider as "gemini" | "bedrock" | "ollama";
  }
  return null;
}

export function hasOrgBedrockCredentials(
  settings: Pick<OrgAiSettings, "encryptedBedrockAccessKeyId" | "encryptedBedrockSecretAccessKey"> | null | undefined,
): boolean {
  return Boolean(settings?.encryptedBedrockAccessKeyId && settings?.encryptedBedrockSecretAccessKey);
}

export function hasOrgSemrushCredentials(
  settings: Pick<OrgAiSettings, "encryptedSemrushApiKey"> | null | undefined,
): boolean {
  return Boolean(settings?.encryptedSemrushApiKey);
}

export type OrgSemrushCredentials = {
  apiKey: string;
  database: string;
};

export async function resolveOrganizationIdForUser(userId: number): Promise<number | null> {
  const [row] = await db
    .select({ organizationId: organizationMembersTable.organizationId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  return row?.organizationId ?? null;
}

export async function getOrgAiSettings(organizationId: number): Promise<OrgAiSettings | null> {
  const [org] = await db
    .select({
      organizationId: organizationsTable.id,
      encryptedGeminiKey: organizationsTable.encryptedGeminiKey,
      encryptedBedrockAccessKeyId: organizationsTable.encryptedBedrockAccessKeyId,
      encryptedBedrockSecretAccessKey: organizationsTable.encryptedBedrockSecretAccessKey,
      encryptedBedrockSessionToken: organizationsTable.encryptedBedrockSessionToken,
      bedrockRegion: organizationsTable.bedrockRegion,
      bedrockModel: organizationsTable.bedrockModel,
      aiProvider: organizationsTable.aiProvider,
      ollamaBaseUrl: organizationsTable.ollamaBaseUrl,
      ollamaModel: organizationsTable.ollamaModel,
      encryptedSemrushApiKey: organizationsTable.encryptedSemrushApiKey,
      semrushDatabase: organizationsTable.semrushDatabase,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  return org ?? null;
}

export async function getOrgAiSettingsForUser(userId: number): Promise<OrgAiSettings | null> {
  const organizationId = await resolveOrganizationIdForUser(userId);
  if (!organizationId) return null;
  return getOrgAiSettings(organizationId);
}

export async function getDecryptedOrgGeminiKey(organizationId: number): Promise<string | null> {
  try {
    const settings = await getOrgAiSettings(organizationId);
    if (!settings?.encryptedGeminiKey) return null;
    return decryptSecret(settings.encryptedGeminiKey);
  } catch (err) {
    logger.warn({ err, organizationId }, "Failed to decrypt org Gemini key");
    return null;
  }
}

export async function getDecryptedOrgBedrockCredentials(
  organizationId: number,
): Promise<BedrockCredentialOptions | null> {
  try {
    const settings = await getOrgAiSettings(organizationId);
    if (!hasOrgBedrockCredentials(settings)) return null;

    const accessKeyId = decryptSecret(settings!.encryptedBedrockAccessKeyId!);
    const secretAccessKey = decryptSecret(settings!.encryptedBedrockSecretAccessKey!);
    const sessionToken = settings!.encryptedBedrockSessionToken
      ? decryptSecret(settings!.encryptedBedrockSessionToken)
      : undefined;

    return {
      accessKeyId,
      secretAccessKey,
      sessionToken,
      region: settings!.bedrockRegion,
      model: settings!.bedrockModel,
    };
  } catch (err) {
    logger.warn({ err, organizationId }, "Failed to decrypt org Bedrock credentials");
    return null;
  }
}

async function getLegacyUserGeminiKey(userId: number): Promise<string | null> {
  try {
    const [user] = await db
      .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user?.encryptedGeminiKey) return null;
    return decryptSecret(user.encryptedGeminiKey);
  } catch (err) {
    logger.warn({ err, userId }, "Failed to decrypt legacy user Gemini key");
    return null;
  }
}

export async function getDecryptedGeminiKeyForUser(userId: number): Promise<string | null> {
  const organizationId = await resolveOrganizationIdForUser(userId);
  if (organizationId) {
    const orgKey = await getDecryptedOrgGeminiKey(organizationId);
    if (orgKey) return orgKey;
  }
  return getLegacyUserGeminiKey(userId);
}

export async function getDecryptedBedrockCredentialsForUser(
  userId: number,
): Promise<BedrockCredentialOptions | null> {
  const organizationId = await resolveOrganizationIdForUser(userId);
  if (!organizationId) return null;
  return getDecryptedOrgBedrockCredentials(organizationId);
}

export async function getDecryptedOrgSemrushCredentials(
  organizationId: number,
): Promise<OrgSemrushCredentials | null> {
  try {
    const settings = await getOrgAiSettings(organizationId);
    if (!hasOrgSemrushCredentials(settings)) return null;

    return {
      apiKey: decryptSecret(settings!.encryptedSemrushApiKey!),
      database: settings!.semrushDatabase?.trim() || "us",
    };
  } catch (err) {
    logger.warn({ err, organizationId }, "Failed to decrypt org Semrush credentials");
    return null;
  }
}

export async function getDecryptedSemrushCredentialsForUser(
  userId: number,
): Promise<OrgSemrushCredentials | null> {
  const organizationId = await resolveOrganizationIdForUser(userId);
  if (!organizationId) return null;
  return getDecryptedOrgSemrushCredentials(organizationId);
}

export function toAiProviderOptionsFromOrg(
  settings: Pick<OrgAiSettings, "aiProvider" | "ollamaBaseUrl" | "ollamaModel" | "bedrockRegion" | "bedrockModel"> | null | undefined,
): AiProviderOptions {
  return {
    providerId: normalizeProvider(settings?.aiProvider),
    ollamaBaseUrl: settings?.ollamaBaseUrl,
    ollamaModel: settings?.ollamaModel,
    bedrock: settings?.bedrockRegion || settings?.bedrockModel
      ? {
          region: settings?.bedrockRegion,
          model: settings?.bedrockModel,
        }
      : undefined,
  };
}

export async function getAiProviderOptionsForUser(userId: number): Promise<AiProviderOptions> {
  try {
    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (orgSettings) {
      const options = toAiProviderOptionsFromOrg(orgSettings);
      const bedrockCreds = await getDecryptedOrgBedrockCredentials(orgSettings.organizationId);
      if (bedrockCreds) {
        options.bedrock = bedrockCreds;
      }
      return options;
    }

    const [user] = await db
      .select({
        aiProvider: usersTable.aiProvider,
        ollamaBaseUrl: usersTable.ollamaBaseUrl,
        ollamaModel: usersTable.ollamaModel,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return {};

    return {
      providerId: normalizeProvider(user.aiProvider),
      ollamaBaseUrl: user.ollamaBaseUrl,
      ollamaModel: user.ollamaModel,
    };
  } catch (err) {
    logger.warn({ err, userId }, "Failed to load AI provider settings");
    return {};
  }
}
