import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { getPlatformSettings, type PlatformStatus } from "./platform-settings";

function releasedCms(next: unknown, fallback: string[]): string[] {
  const keys = Array.isArray(next)
    ? next.filter((key): key is string => typeof key === "string")
    : fallback;
  return keys.includes("wordpress") ? keys : ["wordpress", ...keys];
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
    socialPublishingEnabled: input.socialPublishingEnabled ?? existing.socialPublishingEnabled,
    emailEnabled: input.emailEnabled ?? existing.emailEnabled,
    releasedCmsPlatforms: releasedCms(input.releasedCmsPlatforms, existing.releasedCmsPlatforms),
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
