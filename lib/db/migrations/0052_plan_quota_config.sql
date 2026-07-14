CREATE TABLE IF NOT EXISTS "plan_quota_config" (
  "plan_id" text PRIMARY KEY NOT NULL,
  "articles_per_month" integer,
  "roadmaps_per_month" integer,
  "sites" integer,
  "updated_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "plan_quota_config" ("plan_id", "articles_per_month", "roadmaps_per_month", "sites")
VALUES ('starter', 5, 3, 1)
ON CONFLICT ("plan_id") DO NOTHING;
