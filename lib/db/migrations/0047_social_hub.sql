ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "platform_voices" jsonb;
--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN IF NOT EXISTS "social_schedule_settings" jsonb;
--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "approved_by_user_id" integer;
--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "evergreen_config" jsonb;
--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN IF NOT EXISTS "queue_position" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_post_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_piece_id" integer NOT NULL,
	"platform" text NOT NULL,
	"remote_post_id" text,
	"impressions" integer,
	"likes" integer,
	"comments" integer,
	"shares" integer,
	"clicks" integer,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_post_metrics" ADD CONSTRAINT "social_post_metrics_content_piece_id_content_pieces_id_fk" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_pieces_scheduled_at_idx" ON "content_pieces" USING btree ("scheduled_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_pieces_approval_status_idx" ON "content_pieces" USING btree ("approval_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_post_metrics_content_piece_id_idx" ON "social_post_metrics" USING btree ("content_piece_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_post_metrics_platform_idx" ON "social_post_metrics" USING btree ("platform");
