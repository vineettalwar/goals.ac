CREATE TABLE "gsc_search_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"query" text NOT NULL,
	"page" text,
	"date" date NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"ctr" real DEFAULT 0 NOT NULL,
	"position" real DEFAULT 0 NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_idea_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"source_type" text NOT NULL,
	"file_name" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"imported_by_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_idea_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"spreadsheet_id" text NOT NULL,
	"sheet_name" text,
	"sheet_gid" text,
	"encrypted_config" text,
	"column_mapping" jsonb,
	"last_synced_at" timestamp with time zone,
	"sync_status" text DEFAULT 'idle' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gsc_search_queries" ADD CONSTRAINT "gsc_search_queries_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gsc_search_queries" ADD CONSTRAINT "gsc_search_queries_connection_id_search_property_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."search_property_connections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "article_idea_imports" ADD CONSTRAINT "article_idea_imports_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "article_idea_imports" ADD CONSTRAINT "article_idea_imports_imported_by_user_id_users_id_fk" FOREIGN KEY ("imported_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "article_idea_sources" ADD CONSTRAINT "article_idea_sources_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_search_queries_project_query_page_date_idx" ON "gsc_search_queries" USING btree ("project_id","query","page","date");
