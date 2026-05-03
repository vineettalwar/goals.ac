ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "content_style" jsonb;--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "cache_key" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_pieces_cache_key_idx" ON "content_pieces" ("website_project_id","cache_key");
