CREATE TABLE "site_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"start_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"max_pages" integer DEFAULT 50 NOT NULL,
	"pages_crawled" integer DEFAULT 0 NOT NULL,
	"crawl_complete" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "site_audit_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_audit_id" integer NOT NULL,
	"url" text NOT NULL,
	"status_code" integer,
	"fetch_class" text DEFAULT 'ok' NOT NULL,
	"title" text,
	"meta_description" text,
	"word_count" integer DEFAULT 0 NOT NULL,
	"crawl_depth" integer,
	"from_sitemap" boolean DEFAULT false NOT NULL
);--> statement-breakpoint
CREATE TABLE "site_audit_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_audit_id" integer NOT NULL,
	"issue_type" text NOT NULL,
	"severity" text NOT NULL,
	"page_url" text NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"how_to_fix" text NOT NULL,
	"details" jsonb
);--> statement-breakpoint
ALTER TABLE "site_audits" ADD CONSTRAINT "site_audits_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_pages" ADD CONSTRAINT "site_audit_pages_site_audit_id_site_audits_id_fk" FOREIGN KEY ("site_audit_id") REFERENCES "public"."site_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_issues" ADD CONSTRAINT "site_audit_issues_site_audit_id_site_audits_id_fk" FOREIGN KEY ("site_audit_id") REFERENCES "public"."site_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_audits_project_idx" ON "site_audits" USING btree ("website_project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_audit_pages_audit_idx" ON "site_audit_pages" USING btree ("site_audit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_audit_issues_audit_idx" ON "site_audit_issues" USING btree ("site_audit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_audit_issues_severity_idx" ON "site_audit_issues" USING btree ("site_audit_id","severity");
