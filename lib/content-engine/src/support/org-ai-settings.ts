import { db } from "@workspace/db";
import { organizationMembersTable, organizationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";
import type { AiProviderOptions } from "@workspace/ai-providers";
import { logger } from "../logger";

export interface OrgAiSettings {
  organizationId: number;
  encryptedGeminiKey: string | null;
  aiProvider: string | null;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
}

const SELECTABLE_PROVIDERS = new Set(["gemini", "ollama"]);

function normalizeProvider(provider: string | null | undefined): "gemini" | "ollama" | null {
  if (provider && SELECTABLE_PROVIDERS.has(provider)) {
    return provider as "gemini" | "ollama";
  }
  return null;
}

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
      aiProvider: organizationsTable.aiProvider,
      ollamaBaseUrl: organizationsTable.ollamaBaseUrl,
      ollamaModel: organizationsTable.ollamaModel,
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

export function toAiProviderOptionsFromOrg(
  settings: Pick<OrgAiSettings, "aiProvider" | "ollamaBaseUrl" | "ollamaModel"> | null | undefined,
): AiProviderOptions {
  return {
    providerId: normalizeProvider(settings?.aiProvider),
    ollamaBaseUrl: settings?.ollamaBaseUrl,
    ollamaModel: settings?.ollamaModel,
  };
}

export async function getAiProviderOptionsForUser(userId: number): Promise<AiProviderOptions> {
  try {
    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (orgSettings) {
      return toAiProviderOptionsFromOrg(orgSettings);
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
