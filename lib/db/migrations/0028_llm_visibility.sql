CREATE TABLE IF NOT EXISTS "llm_visibility_prompts" (
  "id" serial PRIMARY KEY NOT NULL,
  "website_project_id" integer NOT NULL REFERENCES "website_projects"("id") ON DELETE cascade,
  "prompt" text NOT NULL,
  "category" text DEFAULT 'custom' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "llm_visibility_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "website_project_id" integer NOT NULL REFERENCES "website_projects"("id") ON DELETE cascade,
  "prompt_id" integer REFERENCES "llm_visibility_prompts"("id") ON DELETE set null,
  "prompt" text NOT NULL,
  "engine" text NOT NULL,
  "cited" boolean DEFAULT false NOT NULL,
  "citation_url" text,
  "competitors_mentioned" text[] DEFAULT '{}' NOT NULL,
  "response_snippet" text,
  "checked_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "visibility_settings" jsonb;

CREATE INDEX IF NOT EXISTS "llm_visibility_snapshots_project_checked_idx"
  ON "llm_visibility_snapshots" ("website_project_id", "checked_at" DESC);

CREATE INDEX IF NOT EXISTS "llm_visibility_prompts_project_idx"
  ON "llm_visibility_prompts" ("website_project_id");
