CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'starter' NOT NULL,
	"owner_id" integer NOT NULL,
	"company_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"assigned_project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "organization_id" integer;
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_assigned_project_id_website_projects_id_fk" FOREIGN KEY ("assigned_project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "organizations_owner_id_idx" ON "organizations" USING btree ("owner_id");
--> statement-breakpoint
CREATE INDEX "organizations_company_id_idx" ON "organizations" USING btree ("company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_uidx" ON "organization_members" USING btree ("organization_id","user_id");
--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "organization_members_assigned_project_id_idx" ON "organization_members" USING btree ("assigned_project_id");
--> statement-breakpoint
CREATE INDEX "website_projects_organization_id_idx" ON "website_projects" USING btree ("organization_id");
--> statement-breakpoint
-- Backfill: one org per user who has website projects or a company
INSERT INTO organizations (name, plan, owner_id, company_id, created_at, updated_at)
SELECT
  COALESCE(c.name, u.name, u.email) AS name,
  COALESCE(u.plan, 'starter') AS plan,
  u.id AS owner_id,
  c.id AS company_id,
  NOW() AS created_at,
  NOW() AS updated_at
FROM users u
LEFT JOIN LATERAL (
  SELECT id, name FROM companies WHERE user_id = u.id ORDER BY id LIMIT 1
) c ON true
WHERE EXISTS (SELECT 1 FROM website_projects wp WHERE wp.user_id = u.id)
   OR c.id IS NOT NULL;
--> statement-breakpoint
INSERT INTO organization_members (organization_id, user_id, role, assigned_project_id, created_at, updated_at)
SELECT o.id, o.owner_id, 'site_admin', NULL, NOW(), NOW()
FROM organizations o;
--> statement-breakpoint
UPDATE website_projects wp
SET organization_id = o.id
FROM organizations o
WHERE o.owner_id = wp.user_id
  AND wp.organization_id IS NULL;
--> statement-breakpoint
ALTER TABLE "website_projects" ALTER COLUMN "organization_id" SET NOT NULL;
