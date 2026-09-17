import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
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
  releasedCmsPlatforms: string[];
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
  releasedCmsPlatforms: ["wordpress"],
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
  releasedCmsPlatforms?: string[] | null;
}): PlatformStatus {
  const released = Array.isArray(row.releasedCmsPlatforms)
    ? row.releasedCmsPlatforms.filter((key): key is string => typeof key === "string")
    : [];
  if (!released.includes("wordpress")) released.unshift("wordpress");
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
    releasedCmsPlatforms: released,
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
