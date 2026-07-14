ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_stripe_connect_access_token" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_stripe_connect_refresh_token" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "stripe_connect_livemode" boolean;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "stripe_connect_connected_at" timestamp with time zone;
