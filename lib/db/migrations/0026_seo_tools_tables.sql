CREATE TABLE "competitor_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer,
	"competitor_url" text NOT NULL,
	"industry" text NOT NULL,
	"location" text NOT NULL,
	"stage" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer,
	"keywords" text[] NOT NULL,
	"website_url" text,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"keyword" text NOT NULL,
	"target_url" text,
	"location" text DEFAULT 'United States' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"device" text DEFAULT 'desktop' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_rank_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracked_keyword_id" integer NOT NULL,
	"position" integer,
	"ranking_url" text,
	"serp_features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" text DEFAULT 'dataforseo' NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD CONSTRAINT "competitor_analyses_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "keyword_analyses" ADD CONSTRAINT "keyword_analyses_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tracked_keywords" ADD CONSTRAINT "tracked_keywords_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "keyword_rank_snapshots" ADD CONSTRAINT "keyword_rank_snapshots_tracked_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("tracked_keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE cascade ON UPDATE no action;
