CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_by_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "key_prefix" text NOT NULL,
  "scopes" jsonb DEFAULT '["render:preview"]'::jsonb NOT NULL,
  "rate_limit_per_hour" integer DEFAULT 60 NOT NULL,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "api_keys_org_id_idx" ON "api_keys" ("organization_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys" ("key_hash");
