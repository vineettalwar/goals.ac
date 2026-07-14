ALTER TABLE "workspaces" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_organization_id_unique" ON "workspaces" USING btree ("organization_id");--> statement-breakpoint
INSERT INTO "workspaces" ("name", "owner_id", "organization_id")
SELECT o.name, o.owner_id, o.id
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "workspaces" w WHERE w.organization_id = o.id
);
