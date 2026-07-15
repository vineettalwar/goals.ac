import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface PlatformStatus {
  platformEnabled: boolean;
  aiGenerationEnabled: boolean;
  maintenanceMessage: string | null;
  signupsEnabled: boolean;
  stripeBillingEnabled: boolean;
  googleIntegrationsEnabled: boolean;
  bingWebmasterEnabled: boolean;
  socialPublishingEnabled: boolean;
  emailEnabled: boolean;
}

const DEFAULT_STATUS: PlatformStatus = {
  platformEnabled: true,
  aiGenerationEnabled: true,
  maintenanceMessage: null,
  signupsEnabled: false,
  stripeBillingEnabled: false,
  googleIntegrationsEnabled: true,
  bingWebmasterEnabled: true,
  socialPublishingEnabled: true,
  emailEnabled: true,
};

function rowToStatus(row: {
  platformEnabled: boolean;
  aiGenerationEnabled: boolean;
  maintenanceMessage: string | null;
  signupsEnabled?: boolean | null;
  stripeBillingEnabled?: boolean | null;
  googleIntegrationsEnabled?: boolean | null;
  bingWebmasterEnabled?: boolean | null;
  socialPublishingEnabled?: boolean | null;
  emailEnabled?: boolean | null;
}): PlatformStatus {
  return {
    platformEnabled: row.platformEnabled,
    aiGenerationEnabled: row.aiGenerationEnabled,
    maintenanceMessage: row.maintenanceMessage,
    signupsEnabled: row.signupsEnabled ?? DEFAULT_STATUS.signupsEnabled,
    stripeBillingEnabled: row.stripeBillingEnabled ?? DEFAULT_STATUS.stripeBillingEnabled,
    googleIntegrationsEnabled:
      row.googleIntegrationsEnabled ?? DEFAULT_STATUS.googleIntegrationsEnabled,
    bingWebmasterEnabled: row.bingWebmasterEnabled ?? DEFAULT_STATUS.bingWebmasterEnabled,
    socialPublishingEnabled:
      row.socialPublishingEnabled ?? DEFAULT_STATUS.socialPublishingEnabled,
    emailEnabled: row.emailEnabled ?? DEFAULT_STATUS.emailEnabled,
  };
}

export async function getPlatformSettings(): Promise<PlatformStatus> {
  try {
    const [row] = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1))
      .limit(1);

    if (!row) return DEFAULT_STATUS;
    return rowToStatus(row);
  } catch {
    return DEFAULT_STATUS;
  }
}

export async function updatePlatformSettings(
  input: Partial<PlatformStatus> & { updatedBy: number },
): Promise<PlatformStatus> {
  const existing = await getPlatformSettings();
  const next: PlatformStatus = {
    platformEnabled: input.platformEnabled ?? existing.platformEnabled,
    aiGenerationEnabled: input.aiGenerationEnabled ?? existing.aiGenerationEnabled,
    maintenanceMessage:
      input.maintenanceMessage !== undefined
        ? input.maintenanceMessage
        : existing.maintenanceMessage,
    signupsEnabled: input.signupsEnabled ?? existing.signupsEnabled,
    stripeBillingEnabled: input.stripeBillingEnabled ?? existing.stripeBillingEnabled,
    googleIntegrationsEnabled:
      input.googleIntegrationsEnabled ?? existing.googleIntegrationsEnabled,
    bingWebmasterEnabled: input.bingWebmasterEnabled ?? existing.bingWebmasterEnabled,
    socialPublishingEnabled:
      input.socialPublishingEnabled ?? existing.socialPublishingEnabled,
    emailEnabled: input.emailEnabled ?? existing.emailEnabled,
  };

  await db
    .insert(platformSettingsTable)
    .values({
      id: 1,
      ...next,
      updatedBy: input.updatedBy,
    })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: {
        ...next,
        updatedBy: input.updatedBy,
      },
    });

  return next;
}

export async function assertAiGenerationEnabled(): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.aiGenerationEnabled) {
    throw new Error("AI services are temporarily unavailable. Please try again later.");
  }
}

export async function assertPlatformEnabled(): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.platformEnabled) {
    throw new Error("We're performing scheduled maintenance. Please try again later.");
  }
}

export async function assertGoogleIntegrationsEnabled(): Promise<void> {
  const [{ googleIntegrationsAvailable }, settings] = await Promise.all([
    import("./platform-features"),
    getPlatformSettings(),
  ]);
  if (!googleIntegrationsAvailable(settings)) {
    throw new Error("Google integrations are disabled on this platform.");
  }
}

export async function assertBingWebmasterEnabled(): Promise<void> {
  const [{ bingWebmasterAvailable }, settings] = await Promise.all([
    import("./platform-features"),
    getPlatformSettings(),
  ]);
  if (!bingWebmasterAvailable(settings)) {
    throw new Error("Bing Webmaster integration is disabled on this platform.");
  }
}

export async function assertSocialPublishingEnabled(): Promise<void> {
  const [linkedInMod, twitterMod, metaMod, settings] = await Promise.all([
    import("@workspace/content-engine/support/social/linkedin-platform-credentials"),
    import("@workspace/content-engine/support/social/twitter-platform-credentials"),
    import("@workspace/content-engine/support/social/meta-platform-credentials"),
    getPlatformSettings(),
  ]);
  if (!settings.socialPublishingEnabled) {
    throw new Error("Social publishing is disabled on this platform.");
  }
  const [hasLinkedIn, hasTwitter, hasMeta] = await Promise.all([
    linkedInMod.hasPlatformLinkedInCredentials(),
    twitterMod.hasPlatformTwitterCredentials(),
    metaMod.hasPlatformMetaCredentials(),
  ]);
  if (!hasLinkedIn && !hasTwitter && !hasMeta) {
    throw new Error("Social publishing is not configured on this platform.");
  }
}

export async function assertEmailDeliveryEnabled(): Promise<void> {
  const [{ hasPlatformResendApiKey }, settings] = await Promise.all([
    import("@workspace/billing"),
    getPlatformSettings(),
  ]);
  if (!settings.emailEnabled) {
    throw new Error("Transactional email is disabled on this platform.");
  }
  if (!(await hasPlatformResendApiKey())) {
    throw new Error("Transactional email is not configured on this platform.");
  }
}
