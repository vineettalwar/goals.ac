import "server-only";

export type {
  IntegrationFieldStatus,
  PlatformBedrockStatus,
  PlatformIntegrationStatus,
} from "@/lib/platform/platform-integration-types";

export {
  clearStoredPlatformBedrockCredentials,
  getPlatformBedrockStatus,
  savePlatformBedrockCredentials,
  setPlatformBedrockOrgGrants,
  type SavePlatformBedrockCredentialsInput,
} from "@/lib/platform/platform-bedrock-admin";

export { isResendManagedByEnv, isStripeManagedByEnv } from "./shared";

export { getPlatformIntegrationStatus } from "./status";

export type {
  SaveBlueskyCredentialsInput,
  SaveLinkedInCredentialsInput,
  SaveMetaCredentialsInput,
  SavePexelsCredentialsInput,
  SaveResendCredentialsInput,
  SaveStripeCredentialsInput,
  SaveTwitterCredentialsInput,
  SaveUnsplashCredentialsInput,
  SaveBingWebmasterCredentialsInput,
  SaveGoogleOAuthCredentialsInput,
} from "./types";

export type { SaveDataForSeoCredentialsInput } from "@/lib/platform/dataforseo-credentials";

export {
  saveDataForSeoCredentials,
  clearStoredDataForSeoCredentials,
} from "@/lib/platform/dataforseo-credentials";

export {
  clearStoredStripeCredentials,
  disconnectStripeConnect,
  isStripeIntegrationReady,
  saveStripeCredentials,
} from "./stripe";

export {
  clearStoredResendCredentials,
  isResendIntegrationReady,
  saveResendCredentials,
} from "./resend";

export {
  clearStoredPexelsCredentials,
  clearStoredUnsplashCredentials,
  savePexelsCredentials,
  saveUnsplashCredentials,
} from "./stock";

export {
  clearStoredBlueskyCredentials,
  clearStoredLinkedInCredentials,
  clearStoredMetaCredentials,
  clearStoredTwitterCredentials,
  saveBlueskyCredentials,
  saveLinkedInCredentials,
  saveMetaCredentials,
  saveTwitterCredentials,
  saveBingWebmasterCredentials,
  clearStoredBingWebmasterCredentials,
  saveGoogleOAuthCredentials,
  clearStoredGoogleOAuthCredentials,
} from "./social-oauth";
