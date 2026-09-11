import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { encryptSecret } from "@workspace/security/encryption";
import {
  invalidateStripeClientCache,
  resolvePlatformResendCredentials,
} from "@workspace/billing";
import { isResendManagedByEnv } from "./shared";
import type { SaveResendCredentialsInput } from "./types";

export type { SaveResendCredentialsInput } from "./types";

export async function saveResendCredentials(input: SaveResendCredentialsInput): Promise<void> {
  if (isResendManagedByEnv()) {
    throw new Error("Resend credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.apiKey !== undefined) {
    patch.encryptedResendApiKey = input.apiKey ? encryptSecret(input.apiKey.trim()) : null;
  }
  if (input.fromEmail !== undefined) {
    patch.resendFromEmail = input.fromEmail?.trim() || null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidateStripeClientCache();
}

export async function clearStoredResendCredentials(updatedBy: number): Promise<void> {
  if (isResendManagedByEnv()) {
    throw new Error("Resend credentials are managed via server environment variables");
  }
  await saveResendCredentials({
    apiKey: "",
    fromEmail: null,
    updatedBy,
  });
}

export async function isResendIntegrationReady(): Promise<boolean> {
  return Boolean((await resolvePlatformResendCredentials())?.apiKey);
}
