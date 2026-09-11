import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { encryptSecret } from "@workspace/security/encryption";
import {
  invalidatePlatformStockCredentialsCache,
  isPexelsManagedByEnv,
  isUnsplashManagedByEnv,
} from "./shared";
import type { SavePexelsCredentialsInput, SaveUnsplashCredentialsInput } from "./types";

export type { SavePexelsCredentialsInput, SaveUnsplashCredentialsInput } from "./types";

export async function saveUnsplashCredentials(input: SaveUnsplashCredentialsInput): Promise<void> {
  if (isUnsplashManagedByEnv()) {
    throw new Error("Unsplash credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.accessKey !== undefined) {
    patch.encryptedUnsplashAccessKey = input.accessKey
      ? encryptSecret(input.accessKey.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformStockCredentialsCache();
}

export async function savePexelsCredentials(input: SavePexelsCredentialsInput): Promise<void> {
  if (isPexelsManagedByEnv()) {
    throw new Error("Pexels credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.apiKey !== undefined) {
    patch.encryptedPexelsApiKey = input.apiKey ? encryptSecret(input.apiKey.trim()) : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformStockCredentialsCache();
}

export async function clearStoredUnsplashCredentials(updatedBy: number): Promise<void> {
  if (isUnsplashManagedByEnv()) {
    throw new Error("Unsplash credentials are managed via server environment variables");
  }
  await saveUnsplashCredentials({ accessKey: "", updatedBy });
}

export async function clearStoredPexelsCredentials(updatedBy: number): Promise<void> {
  if (isPexelsManagedByEnv()) {
    throw new Error("Pexels credentials are managed via server environment variables");
  }
  await savePexelsCredentials({ apiKey: "", updatedBy });
}
