import { pgTable, serial, boolean, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/** Singleton platform-wide settings (one row, id=1). */
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  platformEnabled: boolean("platform_enabled").notNull().default(true),
  aiGenerationEnabled: boolean("ai_generation_enabled").notNull().default(true),
  maintenanceMessage: text("maintenance_message"),
  signupsEnabled: boolean("signups_enabled").notNull().default(false),
  stripeBillingEnabled: boolean("stripe_billing_enabled").notNull().default(false),
  googleIntegrationsEnabled: boolean("google_integrations_enabled").notNull().default(true),
  bingWebmasterEnabled: boolean("bing_webmaster_enabled").notNull().default(true),
  socialPublishingEnabled: boolean("social_publishing_enabled").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  encryptedStripeSecretKey: text("encrypted_stripe_secret_key"),
  encryptedStripeWebhookSecret: text("encrypted_stripe_webhook_secret"),
  stripePriceGrowthMonthly: text("stripe_price_growth_monthly"),
  stripePriceScaleMonthly: text("stripe_price_scale_monthly"),
  encryptedStripeConnectAccessToken: text("encrypted_stripe_connect_access_token"),
  encryptedStripeConnectRefreshToken: text("encrypted_stripe_connect_refresh_token"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeConnectLivemode: boolean("stripe_connect_livemode"),
  stripeConnectConnectedAt: timestamp("stripe_connect_connected_at", { withTimezone: true }),
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
  updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
