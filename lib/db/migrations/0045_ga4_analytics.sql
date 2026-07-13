CREATE TABLE "analytics_property_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"provider" text NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text,
	"stream_id" text,
	"account_email" text,
	"encrypted_tokens" text NOT NULL,
	"property_verified" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ga4_page_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"page_path" text NOT NULL,
	"date" date NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"users" integer DEFAULT 0 NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"engagement_rate" real DEFAULT 0 NOT NULL,
	"avg_session_duration" real DEFAULT 0 NOT NULL,
	"bounce_rate" real DEFAULT 0 NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_property_connections" ADD CONSTRAINT "analytics_property_connections_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ga4_page_metrics" ADD CONSTRAINT "ga4_page_metrics_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ga4_page_metrics" ADD CONSTRAINT "ga4_page_metrics_connection_id_analytics_property_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."analytics_property_connections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_property_connections_project_provider_idx" ON "analytics_property_connections" USING btree ("project_id","provider");
--> statement-breakpoint
CREATE UNIQUE INDEX "ga4_page_metrics_project_page_path_date_idx" ON "ga4_page_metrics" USING btree ("project_id","page_path","date");
