ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "dataforseo_login" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_dataforseo_password" text;
