ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "signups_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "stripe_billing_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "google_integrations_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "bing_webmaster_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "social_publishing_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "email_enabled" boolean DEFAULT true NOT NULL;
