-- Social Hub: history sync meta + metrics upsert key
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "social_history_sync_meta" jsonb;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_post_metrics_piece_platform_uidx" ON "social_post_metrics" ("content_piece_id", "platform");
