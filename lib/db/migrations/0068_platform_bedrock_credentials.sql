ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_bedrock_access_key_id" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_bedrock_secret_access_key" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "encrypted_bedrock_session_token" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "bedrock_region" text;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "bedrock_model" text;

CREATE TABLE IF NOT EXISTS "platform_bedrock_org_grants" (
  "organization_id" integer PRIMARY KEY NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "granted_by" integer REFERENCES "users"("id") ON DELETE set null,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
