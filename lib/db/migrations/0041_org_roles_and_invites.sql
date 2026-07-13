-- Migrate legacy member role to editor
UPDATE "organization_members" SET "role" = 'editor' WHERE "role" = 'member';

CREATE TABLE IF NOT EXISTS "org_invites" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text DEFAULT 'editor' NOT NULL,
  "assigned_project_id" integer REFERENCES "website_projects"("id") ON DELETE SET NULL,
  "token" text NOT NULL,
  "invited_by_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "org_invites_token_uidx" ON "org_invites" ("token");
CREATE INDEX IF NOT EXISTS "org_invites_org_id_idx" ON "org_invites" ("organization_id");
CREATE INDEX IF NOT EXISTS "org_invites_email_idx" ON "org_invites" ("email");
