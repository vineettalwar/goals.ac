ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "subscription_status" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_price_id" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "current_period_end" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_stripe_customer_id_idx" ON "organizations" USING btree ("stripe_customer_id");
