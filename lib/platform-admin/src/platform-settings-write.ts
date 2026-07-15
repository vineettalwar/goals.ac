import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { getPlatformSettings, type PlatformStatus } from "./platform-settings";

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
