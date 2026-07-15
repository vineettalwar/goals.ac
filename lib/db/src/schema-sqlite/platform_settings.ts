import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/** Singleton platform-wide settings (one row, id=1). */
export const platformSettingsTable = sqliteTable("platform_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platformEnabled: integer("platform_enabled", { mode: "boolean" }).notNull().default(true),
  aiGenerationEnabled: integer("ai_generation_enabled", { mode: "boolean" }).notNull().default(true),
  maintenanceMessage: text("maintenance_message"),
  signupsEnabled: integer("signups_enabled", { mode: "boolean" }).notNull().default(false),
  stripeBillingEnabled: integer("stripe_billing_enabled", { mode: "boolean" }).notNull().default(false),
  googleIntegrationsEnabled: integer("google_integrations_enabled", { mode: "boolean" }).notNull().default(true),
  bingWebmasterEnabled: integer("bing_webmaster_enabled", { mode: "boolean" }).notNull().default(true),
  socialPublishingEnabled: integer("social_publishing_enabled", { mode: "boolean" }).notNull().default(true),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(true),
  encryptedStripeSecretKey: text("encrypted_stripe_secret_key"),
  encryptedStripeWebhookSecret: text("encrypted_stripe_webhook_secret"),
  stripePriceGrowthMonthly: text("stripe_price_growth_monthly"),
  stripePriceScaleMonthly: text("stripe_price_scale_monthly"),
  encryptedStripeConnectAccessToken: text("encrypted_stripe_connect_access_token"),
  encryptedStripeConnectRefreshToken: text("encrypted_stripe_connect_refresh_token"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeConnectLivemode: integer("stripe_connect_livemode", { mode: "boolean" }),
  stripeConnectConnectedAt: integer("stripe_connect_connected_at", { mode: "timestamp_ms" }),
  encryptedResendApiKey: text("encrypted_resend_api_key"),
  resendFromEmail: text("resend_from_email"),
  encryptedUnsplashAccessKey: text("encrypted_unsplash_access_key"),
  encryptedPexelsApiKey: text("encrypted_pexels_api_key"),
  linkedinClientId: text("linkedin_client_id"),
  encryptedLinkedinClientSecret: text("encrypted_linkedin_client_secret"),
  twitterClientId: text("twitter_client_id"),
  encryptedTwitterClientSecret: text("encrypted_twitter_client_secret"),
  metaAppId: text("meta_app_id"),
  encryptedMetaAppSecret: text("encrypted_meta_app_secret"),
  blueskyClientName: text("bluesky_client_name"),
  encryptedBlueskyOauthPrivateKeyJwk: text("encrypted_bluesky_oauth_private_key_jwk"),
  encryptedBedrockAccessKeyId: text("encrypted_bedrock_access_key_id"),
  encryptedBedrockSecretAccessKey: text("encrypted_bedrock_secret_access_key"),
  encryptedBedrockSessionToken: text("encrypted_bedrock_session_token"),
  bedrockRegion: text("bedrock_region"),
  bedrockModel: text("bedrock_model"),
  updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
