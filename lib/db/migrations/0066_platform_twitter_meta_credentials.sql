ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "twitter_client_id" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_twitter_client_secret" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "meta_app_id" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_meta_app_secret" text;
