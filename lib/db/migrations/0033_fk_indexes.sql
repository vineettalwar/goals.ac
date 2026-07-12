-- FK indexes for JOIN/cascade performance (postgres-drizzle skill audit)

CREATE INDEX IF NOT EXISTS "keyword_rank_snapshots_tracked_keyword_checked_idx"
  ON "keyword_rank_snapshots" ("tracked_keyword_id", "checked_at");

CREATE INDEX IF NOT EXISTS "website_projects_user_id_idx"
  ON "website_projects" ("user_id");

CREATE INDEX IF NOT EXISTS "goals_project_id_idx"
  ON "goals" ("project_id");

CREATE INDEX IF NOT EXISTS "briefs_goal_id_idx"
  ON "briefs" ("goal_id");

CREATE INDEX IF NOT EXISTS "tracked_keywords_website_project_id_idx"
  ON "tracked_keywords" ("website_project_id");

CREATE INDEX IF NOT EXISTS "content_pieces_website_project_id_idx"
  ON "content_pieces" ("website_project_id");

CREATE INDEX IF NOT EXISTS "content_pieces_brief_id_idx"
  ON "content_pieces" ("brief_id");

CREATE INDEX IF NOT EXISTS "content_pieces_content_item_id_idx"
  ON "content_pieces" ("content_item_id");

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx"
  ON "sessions" ("user_id");

CREATE INDEX IF NOT EXISTS "companies_user_id_idx"
  ON "companies" ("user_id");
