CREATE TABLE IF NOT EXISTS "keyword_opportunities" (
  "id" serial PRIMARY KEY NOT NULL,
  "website_project_id" integer NOT NULL REFERENCES "website_projects"("id") ON DELETE cascade,
  "keyword" text NOT NULL,
  "source" text NOT NULL,
  "competitor_url" text,
  "estimated_volume" text,
  "difficulty" text,
  "opportunity_score" integer DEFAULT 0 NOT NULL,
  "intent" text,
  "suggested_title" text NOT NULL,
  "suggested_angle" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "content_item_id" integer REFERENCES "content_items"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "keyword_rank_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "website_project_id" integer NOT NULL REFERENCES "website_projects"("id") ON DELETE cascade,
  "tracked_keyword_id" integer NOT NULL REFERENCES "tracked_keywords"("id") ON DELETE cascade,
  "keyword" text NOT NULL,
  "previous_position" integer,
  "current_position" integer,
  "change_amount" integer NOT NULL,
  "severity" text NOT NULL,
  "message" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "keyword_opportunities_project_status_idx"
  ON "keyword_opportunities" ("website_project_id", "status");

CREATE INDEX IF NOT EXISTS "keyword_rank_alerts_project_status_idx"
  ON "keyword_rank_alerts" ("website_project_id", "status");
