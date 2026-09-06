CREATE TABLE "gsc_url_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"content_piece_id" integer,
	"publish_record_id" integer,
	"inspection_url" text NOT NULL,
	"site_url" text NOT NULL,
	"verdict" text,
	"coverage_state" text,
	"indexing_state" text,
	"robots_txt_state" text,
	"page_fetch_state" text,
	"google_canonical" text,
	"user_canonical" text,
	"last_crawl_time" text,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"raw_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "gsc_url_inspections" ADD CONSTRAINT "gsc_url_inspections_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_url_inspections" ADD CONSTRAINT "gsc_url_inspections_content_piece_id_content_pieces_id_fk" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_url_inspections_project_inspected_idx" ON "gsc_url_inspections" USING btree ("website_project_id","inspected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_url_inspections_content_piece_idx" ON "gsc_url_inspections" USING btree ("content_piece_id");
