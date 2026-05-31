CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"website_url" text NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"target_audience" text DEFAULT '' NOT NULL,
	"competitor_urls" text[] DEFAULT '{}' NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketing_personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"age_range" text DEFAULT '' NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"pain_points" text[] DEFAULT '{}' NOT NULL,
	"goals" text[] DEFAULT '{}' NOT NULL,
	"preferred_content" text[] DEFAULT '{}' NOT NULL,
	"demographics" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"persona_id" integer,
	"title" text,
	"body_markdown" text,
	"meta_description" text,
	"primary_keyword" text,
	"secondary_keywords" text[] DEFAULT '{}' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_date" date,
	"published_url" text,
	"wordpress_post_id" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wordpress_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"site_url" text NOT NULL,
	"username" text NOT NULL,
	"encrypted_app_password" text NOT NULL,
	"default_category_id" integer,
	"default_status" text DEFAULT 'draft' NOT NULL,
	"last_tested_at" timestamp with time zone,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wordpress_connections_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marketing_personas" ADD CONSTRAINT "marketing_personas_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_articles" ADD CONSTRAINT "scheduled_articles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_articles" ADD CONSTRAINT "scheduled_articles_persona_id_marketing_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."marketing_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wordpress_connections" ADD CONSTRAINT "wordpress_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
