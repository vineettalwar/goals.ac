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

export const DEFAULT_PLATFORM_STATUS: PlatformStatus = {
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
