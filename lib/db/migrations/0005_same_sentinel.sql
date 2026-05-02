CREATE TABLE "seo_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"roadmap_id" integer,
	"website_project_id" integer,
	"brand_name" text NOT NULL,
	"website_url" text NOT NULL,
	"industry" text NOT NULL,
	"location" text NOT NULL,
	"stage" text NOT NULL,
	"title" text NOT NULL,
	"meta_description" text NOT NULL,
	"primary_keyword" text NOT NULL,
	"secondary_keywords" text[] DEFAULT '{}' NOT NULL,
	"content" text NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "website_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"sitemap_url" text,
	"page_count" integer DEFAULT 0 NOT NULL,
	"crawl_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"target_audience" text DEFAULT '' NOT NULL,
	"voice_tone" text DEFAULT '' NOT NULL,
	"primary_keywords" text[] DEFAULT '{}' NOT NULL,
	"competitor_urls" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_profiles_website_project_id_unique" UNIQUE("website_project_id")
);
--> statement-breakpoint
ALTER TABLE "content_strategies" ADD COLUMN "website_project_id" integer;--> statement-breakpoint
ALTER TABLE "geo_audits" ADD COLUMN "website_project_id" integer;--> statement-breakpoint
ALTER TABLE "seo_articles" ADD CONSTRAINT "seo_articles_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_articles" ADD CONSTRAINT "seo_articles_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_strategies" ADD CONSTRAINT "content_strategies_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audits" ADD CONSTRAINT "geo_audits_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;