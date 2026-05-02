CREATE TABLE "project_roadmaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"roadmap_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_roadmaps_unique" UNIQUE("project_id","roadmap_id")
);
--> statement-breakpoint
ALTER TABLE "project_roadmaps" ADD CONSTRAINT "project_roadmaps_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_roadmaps" ADD CONSTRAINT "project_roadmaps_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;