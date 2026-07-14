import { db } from "@workspace/db";
import { organizationsTable, websiteProjectsTable } from "@workspace/db/schema";
import type { EncryptedStockCredentialsMap } from "@workspace/db/schema/stock-credentials";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";
import {
  isStockProviderId,
  type DecryptedStockCredentialContext,
  type StockProviderId,
} from "@workspace/stock-images";
import { logger } from "../../core/logger";

function decryptCredentialMap(
  encrypted: EncryptedStockCredentialsMap | null | undefined,
): Partial<Record<StockProviderId, string>> {
  if (!encrypted) return {};
  const out: Partial<Record<StockProviderId, string>> = {};
  for (const [provider, ciphertext] of Object.entries(encrypted)) {
    if (!isStockProviderId(provider) || typeof ciphertext !== "string" || !ciphertext) continue;
    try {
      out[provider] = decryptSecret(ciphertext);
    } catch (err) {
      logger.warn({ err, provider }, "Failed to decrypt stock credential");
    }
  }
  return out;
}

export async function getOrgEncryptedStockCredentials(
  organizationId: number,
): Promise<EncryptedStockCredentialsMap | null> {
  const [org] = await db
    .select({ encryptedStockCredentials: organizationsTable.encryptedStockCredentials })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);
  return org?.encryptedStockCredentials ?? null;
}

export async function getDecryptedOrgStockCredentials(
  organizationId: number,
): Promise<Partial<Record<StockProviderId, string>>> {
  const encrypted = await getOrgEncryptedStockCredentials(organizationId);
  return decryptCredentialMap(encrypted ?? undefined);
}

export function getDecryptedProjectStockCredentials(
  imageSettings?: { encryptedStockCredentials?: EncryptedStockCredentialsMap } | null,
): Partial<Record<StockProviderId, string>> {
  return decryptCredentialMap(imageSettings?.encryptedStockCredentials);
}

export async function loadStockCredentialContextForProject(
  projectId: number,
): Promise<DecryptedStockCredentialContext> {
  const [project] = await db
    .select({
      organizationId: websiteProjectsTable.organizationId,
      contentStyle: websiteProjectsTable.contentStyle,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) {
    return {};
  }

  const contentStyle = project.contentStyle as {
    imageSettings?: { encryptedStockCredentials?: EncryptedStockCredentialsMap };
  } | null;

  const org =
    project.organizationId != null
      ? await getDecryptedOrgStockCredentials(project.organizationId)
      : {};

  const projectCreds = getDecryptedProjectStockCredentials(contentStyle?.imageSettings);

  return {
    org: Object.keys(org).length > 0 ? org : undefined,
    project: Object.keys(projectCreds).length > 0 ? projectCreds : undefined,
  };
}

export function maskStockCredentialLastFour(
  encryptedMap: EncryptedStockCredentialsMap | null | undefined,
): Partial<Record<StockProviderId, string>> {
  if (!encryptedMap) return {};
  const out: Partial<Record<StockProviderId, string>> = {};
  for (const [provider, ciphertext] of Object.entries(encryptedMap)) {
    if (!isStockProviderId(provider) || typeof ciphertext !== "string" || !ciphertext) continue;
    try {
      out[provider] = decryptSecret(ciphertext).slice(-4);
    } catch {
      out[provider] = "••••";
    }
  }
  return out;
}
