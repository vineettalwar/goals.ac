ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_unsplash_access_key" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_pexels_api_key" text;
