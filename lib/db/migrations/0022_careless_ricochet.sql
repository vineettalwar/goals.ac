CREATE TABLE "integration_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"encrypted_secret" text NOT NULL,
	"default_status" text DEFAULT 'draft' NOT NULL,
	"last_tested_at" timestamp with time zone,
	"last_test_ok" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;