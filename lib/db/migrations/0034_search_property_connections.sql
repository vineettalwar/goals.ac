CREATE TABLE IF NOT EXISTS "search_property_connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "provider" text NOT NULL,
  "property_url" text,
  "account_email" text,
  "encrypted_tokens" text NOT NULL,
  "property_verified" boolean DEFAULT false NOT NULL,
  "connected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search_property_connections" ADD CONSTRAINT "search_property_connections_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "search_property_connections_project_provider_idx" ON "search_property_connections" USING btree ("project_id","provider");
