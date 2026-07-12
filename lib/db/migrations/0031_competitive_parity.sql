ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "brand_colors" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "product_offerings" text[] DEFAULT '{}' NOT NULL;

CREATE TABLE IF NOT EXISTS "waitlist_signups" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "feature_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_feature_idx" ON "waitlist_signups" ("email", "feature_key");
