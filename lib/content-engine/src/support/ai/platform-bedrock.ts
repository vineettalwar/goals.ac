import { db } from "@workspace/db";
import {
  platformBedrockOrgGrantsTable,
  platformSettingsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";
import type { BedrockCredentialOptions } from "@workspace/ai-providers";
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

export async function isOrgGrantedPlatformBedrock(organizationId: number): Promise<boolean> {
  try {
    const [row] = await db
      .select({ organizationId: platformBedrockOrgGrantsTable.organizationId })
      .from(platformBedrockOrgGrantsTable)
      .where(eq(platformBedrockOrgGrantsTable.organizationId, organizationId))
      .limit(1);
    return Boolean(row);
  } catch (err) {
    logger.warn({ err, organizationId }, "Failed to check platform Bedrock grant");
    return false;
  }
}

/** Platform Bedrock material (env overrides DB). Does not check org grants. */
export async function loadPlatformBedrockCredentials(): Promise<BedrockCredentialOptions | null> {
  const envAccessKeyId = envTrim("AWS_ACCESS_KEY_ID");
  const envSecretAccessKey = envTrim("AWS_SECRET_ACCESS_KEY");
  if (envAccessKeyId && envSecretAccessKey) {
    return {
      accessKeyId: envAccessKeyId,
      secretAccessKey: envSecretAccessKey,
      sessionToken: envTrim("AWS_SESSION_TOKEN") ?? undefined,
      region: envTrim("AWS_REGION") ?? envTrim("AWS_DEFAULT_REGION") ?? undefined,
      model: envTrim("BEDROCK_MODEL") ?? undefined,
    };
  }

  try {
    const [row] = await db
      .select({
        encryptedBedrockAccessKeyId: platformSettingsTable.encryptedBedrockAccessKeyId,
        encryptedBedrockSecretAccessKey: platformSettingsTable.encryptedBedrockSecretAccessKey,
        encryptedBedrockSessionToken: platformSettingsTable.encryptedBedrockSessionToken,
        bedrockRegion: platformSettingsTable.bedrockRegion,
        bedrockModel: platformSettingsTable.bedrockModel,
      })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1))
      .limit(1);

    const accessKeyId = safeDecrypt(row?.encryptedBedrockAccessKeyId);
    const secretAccessKey = safeDecrypt(row?.encryptedBedrockSecretAccessKey);
    if (!accessKeyId || !secretAccessKey) return null;

    return {
      accessKeyId,
      secretAccessKey,
      sessionToken: safeDecrypt(row?.encryptedBedrockSessionToken) ?? undefined,
      region: row?.bedrockRegion ?? undefined,
      model: row?.bedrockModel ?? undefined,
    };
  } catch (err) {
    logger.warn({ err }, "Failed to load platform Bedrock credentials");
    return null;
  }
}

/**
 * Platform Bedrock for a granted org. Null when ungranted or credentials missing.
 * Pure priority helper for tests: org BYOK is checked by the caller first.
 */
export async function resolvePlatformBedrockCredentialsForOrg(
  organizationId: number,
): Promise<BedrockCredentialOptions | null> {
  if (!(await isOrgGrantedPlatformBedrock(organizationId))) return null;
  return loadPlatformBedrockCredentials();
}

/** Pure resolution order for tests (no I/O). */
export function pickBedrockCredentialSource(input: {
  hasOrgByok: boolean;
  isGranted: boolean;
  hasPlatformCredentials: boolean;
}): "org-byok" | "platform-grant" | "none" {
  if (input.hasOrgByok) return "org-byok";
  if (input.isGranted && input.hasPlatformCredentials) return "platform-grant";
  return "none";
}
