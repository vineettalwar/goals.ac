import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { encryptSecret } from "@workspace/security/encryption";
import {
  invalidatePlatformLinkedInCredentialsCache,
  isLinkedInManagedByEnv,
} from "@workspace/content-engine/support/social/linkedin-platform-credentials";
import {
  invalidatePlatformTwitterCredentialsCache,
  isTwitterManagedByEnv,
} from "@workspace/content-engine/support/social/twitter-platform-credentials";
import {
  invalidatePlatformMetaCredentialsCache,
  isMetaManagedByEnv,
} from "@workspace/content-engine/support/social/meta-platform-credentials";
import {
  invalidatePlatformBlueskyCredentialsCache,
  isBlueskyManagedByEnv,
} from "@workspace/content-engine/support/social/bluesky-platform-credentials";
import { isBingManagedByEnv } from "@/lib/platform/bing-webmaster-credentials";
import { isGoogleManagedByEnv } from "@/lib/platform/google-oauth-credentials";
import type {
  SaveBlueskyCredentialsInput,
  SaveLinkedInCredentialsInput,
  SaveMetaCredentialsInput,
  SaveTwitterCredentialsInput,
  SaveBingWebmasterCredentialsInput,
  SaveGoogleOAuthCredentialsInput,
} from "./types";

export type {
  SaveBlueskyCredentialsInput,
  SaveLinkedInCredentialsInput,
  SaveMetaCredentialsInput,
  SaveTwitterCredentialsInput,
} from "./types";

function parseBlueskyPrivateKeyJwk(raw: string): string {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Bluesky private key must be valid JSON JWK");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("kty" in parsed) ||
    typeof (parsed as { kty: unknown }).kty !== "string"
  ) {
    throw new Error("Bluesky private key JWK must include a kty field");
  }
  return trimmed;
}

export async function saveLinkedInCredentials(input: SaveLinkedInCredentialsInput): Promise<void> {
  if (isLinkedInManagedByEnv()) {
    throw new Error("LinkedIn credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.linkedinClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedLinkedinClientSecret = input.clientSecret
      ? encryptSecret(input.clientSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformLinkedInCredentialsCache();
}

export async function clearStoredLinkedInCredentials(updatedBy: number): Promise<void> {
  if (isLinkedInManagedByEnv()) {
    throw new Error("LinkedIn credentials are managed via server environment variables");
  }
  await saveLinkedInCredentials({ clientId: null, clientSecret: "", updatedBy });
}

export async function saveTwitterCredentials(input: SaveTwitterCredentialsInput): Promise<void> {
  if (isTwitterManagedByEnv()) {
    throw new Error("X credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.twitterClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedTwitterClientSecret = input.clientSecret
      ? encryptSecret(input.clientSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformTwitterCredentialsCache();
}

export async function clearStoredTwitterCredentials(updatedBy: number): Promise<void> {
  if (isTwitterManagedByEnv()) {
    throw new Error("X credentials are managed via server environment variables");
  }
  await saveTwitterCredentials({ clientId: null, clientSecret: "", updatedBy });
}

export async function saveMetaCredentials(input: SaveMetaCredentialsInput): Promise<void> {
  if (isMetaManagedByEnv()) {
    throw new Error("Meta credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.appId !== undefined) {
    patch.metaAppId = input.appId?.trim() || null;
  }
  if (input.appSecret !== undefined) {
    patch.encryptedMetaAppSecret = input.appSecret
      ? encryptSecret(input.appSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformMetaCredentialsCache();
}

export async function clearStoredMetaCredentials(updatedBy: number): Promise<void> {
  if (isMetaManagedByEnv()) {
    throw new Error("Meta credentials are managed via server environment variables");
  }
  await saveMetaCredentials({ appId: null, appSecret: "", updatedBy });
}

export async function saveBlueskyCredentials(input: SaveBlueskyCredentialsInput): Promise<void> {
  if (isBlueskyManagedByEnv()) {
    throw new Error("Bluesky credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientName !== undefined) {
    patch.blueskyClientName = input.clientName?.trim() || null;
  }
  if (input.privateKeyJwk !== undefined) {
    patch.encryptedBlueskyOauthPrivateKeyJwk = input.privateKeyJwk
      ? encryptSecret(parseBlueskyPrivateKeyJwk(input.privateKeyJwk))
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformBlueskyCredentialsCache();
  const { invalidateBlueskyOAuthClient } = await import("@/lib/integrations/oauth/bluesky-oauth");
  invalidateBlueskyOAuthClient();
}

export async function clearStoredBlueskyCredentials(updatedBy: number): Promise<void> {
  if (isBlueskyManagedByEnv()) {
    throw new Error("Bluesky credentials are managed via server environment variables");
  }
  await saveBlueskyCredentials({ clientName: null, privateKeyJwk: "", updatedBy });
}

export async function saveBingWebmasterCredentials(
  input: SaveBingWebmasterCredentialsInput,
): Promise<void> {
  if (isBingManagedByEnv()) {
    throw new Error("Bing Webmaster credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.bingWebmasterClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedBingWebmasterClientSecret = input.clientSecret
      ? encryptSecret(input.clientSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });
}

export async function clearStoredBingWebmasterCredentials(updatedBy: number): Promise<void> {
  if (isBingManagedByEnv()) {
    throw new Error("Bing Webmaster credentials are managed via server environment variables");
  }
  await saveBingWebmasterCredentials({ clientId: null, clientSecret: "", updatedBy });
}

export async function saveGoogleOAuthCredentials(
  input: SaveGoogleOAuthCredentialsInput,
): Promise<void> {
  if (isGoogleManagedByEnv()) {
    throw new Error("Google credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.googleClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedGoogleClientSecret = input.clientSecret
      ? encryptSecret(input.clientSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });
}

export async function clearStoredGoogleOAuthCredentials(updatedBy: number): Promise<void> {
  if (isGoogleManagedByEnv()) {
    throw new Error("Google credentials are managed via server environment variables");
  }
  await saveGoogleOAuthCredentials({ clientId: null, clientSecret: "", updatedBy });
}
