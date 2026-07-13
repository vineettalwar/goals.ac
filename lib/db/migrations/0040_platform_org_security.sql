CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "platform_enabled" boolean DEFAULT true NOT NULL,
  "ai_generation_enabled" boolean DEFAULT true NOT NULL,
  "maintenance_message" text,
  "updated_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "platform_settings" ("id", "platform_enabled", "ai_generation_enabled")
VALUES (1, true, true)
ON CONFLICT DO NOTHING;

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "suspended_reason" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "security_settings" jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS "org_audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "actor_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "resource_type" text,
  "resource_id" text,
  "metadata" jsonb,
  "ip" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "org_audit_log_org_id_idx" ON "org_audit_log" ("organization_id");
CREATE INDEX IF NOT EXISTS "org_audit_log_created_at_idx" ON "org_audit_log" ("created_at");
