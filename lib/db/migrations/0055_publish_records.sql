CREATE TABLE IF NOT EXISTS "publish_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "content_piece_id" integer NOT NULL REFERENCES "content_pieces"("id") ON DELETE CASCADE,
  "website_project_id" integer NOT NULL REFERENCES "website_projects"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "connection_id" integer,
  "idempotency_key" text NOT NULL,
  "remote_id" text,
  "remote_url" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "error_message" text,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "publish_records_idempotency_uidx" ON "publish_records" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "publish_records_piece_id_idx" ON "publish_records" ("content_piece_id");
CREATE INDEX IF NOT EXISTS "publish_records_project_id_idx" ON "publish_records" ("website_project_id");
CREATE INDEX IF NOT EXISTS "publish_records_provider_idx" ON "publish_records" ("provider");
