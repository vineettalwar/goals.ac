ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "bluesky_client_name" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_bluesky_oauth_private_key_jwk" text;
