ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "cache_key" text;
CREATE INDEX IF NOT EXISTS "content_pieces_cache_key_idx" ON "content_pieces" ("website_project_id", "cache_key");
