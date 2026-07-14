import { db } from "@workspace/db";
import { organizationsTable, websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema/website_projects";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";
import {
  type DecryptedDeeplCredentialContext,
  resolveDeeplApiKey,
  resolveDeeplCredentialSource,
} from "@workspace/deepl";
import { logger } from "../logger";

export async function getOrgEncryptedDeeplApiKey(
  organizationId: number,
): Promise<string | null> {
  const [org] = await db
    .select({ encryptedDeeplApiKey: organizationsTable.encryptedDeeplApiKey })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);
  return org?.encryptedDeeplApiKey ?? null;
}

export async function getDecryptedOrgDeeplApiKey(
  organizationId: number,
): Promise<string | undefined> {
  const encrypted = await getOrgEncryptedDeeplApiKey(organizationId);
  if (!encrypted) return undefined;
  try {
    return decryptSecret(encrypted);
  } catch (err) {
    logger.warn({ err, organizationId }, "Failed to decrypt org DeepL key");
    return undefined;
  }
}

export function getDecryptedProjectDeeplApiKey(
  contentStyle?: ContentStyle | null,
): string | undefined {
  const encrypted = contentStyle?.translationSettings?.encryptedDeeplApiKey;
  if (!encrypted) return undefined;
  try {
    return decryptSecret(encrypted);
  } catch (err) {
    logger.warn({ err }, "Failed to decrypt project DeepL key");
    return undefined;
  }
}

export async function loadDeeplCredentialContextForProject(
  projectId: number,
): Promise<DecryptedDeeplCredentialContext> {
  const [project] = await db
    .select({
      organizationId: websiteProjectsTable.organizationId,
      contentStyle: websiteProjectsTable.contentStyle,
      userId: websiteProjectsTable.userId,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) {
    return {};
  }

  const contentStyle = (project.contentStyle as ContentStyle | null) ?? null;
  const org =
    project.organizationId != null
      ? await getDecryptedOrgDeeplApiKey(project.organizationId)
      : undefined;
  const projectKey = getDecryptedProjectDeeplApiKey(contentStyle);

  return {
    org,
    project: projectKey,
  };
}

export function maskDeeplApiKeyLastFour(apiKey: string | undefined): string | null {
  if (!apiKey?.trim()) return null;
  return apiKey.trim().slice(-4);
}

export function maskEncryptedDeeplApiKeyLastFour(
  encrypted: string | null | undefined,
): string | null {
  if (!encrypted) return null;
  try {
    return decryptSecret(encrypted).slice(-4);
  } catch {
    return "••••";
  }
}

export {
  resolveDeeplApiKey,
  resolveDeeplCredentialSource,
  type DecryptedDeeplCredentialContext,
};
