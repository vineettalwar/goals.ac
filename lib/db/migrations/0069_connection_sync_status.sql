ALTER TABLE "search_property_connections" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
ALTER TABLE "search_property_connections" ADD COLUMN IF NOT EXISTS "last_sync_status" text;
ALTER TABLE "search_property_connections" ADD COLUMN IF NOT EXISTS "last_sync_error" text;

ALTER TABLE "analytics_property_connections" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
ALTER TABLE "analytics_property_connections" ADD COLUMN IF NOT EXISTS "last_sync_status" text;
ALTER TABLE "analytics_property_connections" ADD COLUMN IF NOT EXISTS "last_sync_error" text;
