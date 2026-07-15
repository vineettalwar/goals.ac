ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "linkedin_client_id" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_linkedin_client_secret" text;
