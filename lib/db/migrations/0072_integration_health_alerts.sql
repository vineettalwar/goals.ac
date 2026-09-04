CREATE TABLE "integration_health_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"organization_id" integer,
	"platform" text NOT NULL,
	"alert_type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone,
	"resolved_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "integration_health_alerts" ADD CONSTRAINT "integration_health_alerts_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_health_alerts" ADD CONSTRAINT "integration_health_alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_health_alerts_project_status_idx" ON "integration_health_alerts" USING btree ("website_project_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_health_alerts_org_status_idx" ON "integration_health_alerts" USING btree ("organization_id","status");
