CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"user_id" integer,
	"goal_kind" text NOT NULL,
	"goal" jsonb NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"stop_reason" text,
	"policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trajectory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"credits_spent" integer DEFAULT 0 NOT NULL,
	"content_piece_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"fingerprint" text NOT NULL,
	"action_type" text NOT NULL,
	"title" text NOT NULL,
	"keyword" text NOT NULL,
	"url" text,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_impact" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"effort" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opportunity_score" integer DEFAULT 0 NOT NULL,
	"last_run_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_content_piece_id_content_pieces_id_fk" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action_items" ADD CONSTRAINT "agent_action_items_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action_items" ADD CONSTRAINT "agent_action_items_last_run_id_agent_runs_id_fk" FOREIGN KEY ("last_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_action_items_project_idx" ON "agent_action_items" USING btree ("website_project_id");--> statement-breakpoint
CREATE INDEX "agent_action_items_status_idx" ON "agent_action_items" USING btree ("website_project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_action_items_fingerprint_uidx" ON "agent_action_items" USING btree ("website_project_id","fingerprint");--> statement-breakpoint
CREATE INDEX "agent_runs_project_idx" ON "agent_runs" USING btree ("website_project_id");--> statement-breakpoint
CREATE INDEX "agent_runs_status_idx" ON "agent_runs" USING btree ("website_project_id","status");
