ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "google_client_id" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_google_client_secret" text;
