ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "bing_webmaster_client_id" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_bing_webmaster_client_secret" text;
