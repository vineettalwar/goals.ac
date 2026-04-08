CREATE TABLE "geo_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"roadmap_id" integer,
	"url" text NOT NULL,
	"geo_score" integer NOT NULL,
	"issues" jsonb NOT NULL,
	"page_title" text,
	"meta_description" text,
	"has_schema_org" boolean DEFAULT false NOT NULL,
	"schema_types" text[] DEFAULT '{}' NOT NULL,
	"h1_count" integer DEFAULT 0 NOT NULL,
	"image_count" integer DEFAULT 0 NOT NULL,
	"images_missing_alt" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_audits" ADD CONSTRAINT "geo_audits_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE no action ON UPDATE no action;