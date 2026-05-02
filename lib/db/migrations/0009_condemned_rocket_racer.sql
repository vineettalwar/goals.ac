CREATE TABLE "content_pieces" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"format_type" text NOT NULL,
	"title" text NOT NULL,
	"target_keyword" text DEFAULT '' NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"planned_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;