import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface PlatformStatus {
  platformEnabled: boolean;
  aiGenerationEnabled: boolean;
  maintenanceMessage: string | null;
}

const DEFAULT_STATUS: PlatformStatus = {
  platformEnabled: true,
  aiGenerationEnabled: true,
  maintenanceMessage: null,
};

export async function getPlatformSettings(): Promise<PlatformStatus> {
  const [row] = await db
    .select({
      platformEnabled: platformSettingsTable.platformEnabled,
      aiGenerationEnabled: platformSettingsTable.aiGenerationEnabled,
      maintenanceMessage: platformSettingsTable.maintenanceMessage,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  if (!row) return DEFAULT_STATUS;

  return {
    platformEnabled: row.platformEnabled,
    aiGenerationEnabled: row.aiGenerationEnabled,
    maintenanceMessage: row.maintenanceMessage,
  };
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
  };

  await db
    .insert(platformSettingsTable)
    .values({
      id: 1,
      platformEnabled: next.platformEnabled,
      aiGenerationEnabled: next.aiGenerationEnabled,
      maintenanceMessage: next.maintenanceMessage,
      updatedBy: input.updatedBy,
    })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: {
        platformEnabled: next.platformEnabled,
        aiGenerationEnabled: next.aiGenerationEnabled,
        maintenanceMessage: next.maintenanceMessage,
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
