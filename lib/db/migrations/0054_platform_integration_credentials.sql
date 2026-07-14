ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_stripe_secret_key" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_stripe_webhook_secret" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "stripe_price_growth_monthly" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "stripe_price_scale_monthly" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_resend_api_key" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "resend_from_email" text;
