CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "brand_voice_skill" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "skill_locked" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brand_voice_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"raw_text" text,
	"metadata" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brand_voice_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"website_project_id" integer NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"text" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"embedding" vector(768) NOT NULL,
	"embedding_model" text DEFAULT 'text-embedding-004' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "brand_voice_sources" ADD CONSTRAINT "brand_voice_sources_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "brand_voice_chunks" ADD CONSTRAINT "brand_voice_chunks_source_id_brand_voice_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."brand_voice_sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "brand_voice_chunks" ADD CONSTRAINT "brand_voice_chunks_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_voice_sources_project_idx" ON "brand_voice_sources" USING btree ("website_project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_voice_sources_project_type_idx" ON "brand_voice_sources" USING btree ("website_project_id","source_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_voice_chunks_project_idx" ON "brand_voice_chunks" USING btree ("website_project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_voice_chunks_source_idx" ON "brand_voice_chunks" USING btree ("source_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_voice_chunks_embedding_idx" ON "brand_voice_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
