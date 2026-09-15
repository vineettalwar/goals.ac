CREATE TABLE "seo_chat_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"user_id" integer,
	"title" text DEFAULT 'New chat' NOT NULL,
	"last_agent_run_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"agent_run_id" integer,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_chat_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_project_id" integer NOT NULL,
	"brand_voice_notes" text DEFAULT '' NOT NULL,
	"banned_claims" text DEFAULT '' NOT NULL,
	"last_decisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_chat_threads" ADD CONSTRAINT "seo_chat_threads_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_chat_threads" ADD CONSTRAINT "seo_chat_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_chat_threads" ADD CONSTRAINT "seo_chat_threads_last_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("last_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_chat_messages" ADD CONSTRAINT "seo_chat_messages_thread_id_seo_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."seo_chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_chat_messages" ADD CONSTRAINT "seo_chat_messages_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_chat_memory" ADD CONSTRAINT "project_chat_memory_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_chat_threads_project_idx" ON "seo_chat_threads" USING btree ("website_project_id");--> statement-breakpoint
CREATE INDEX "seo_chat_threads_user_idx" ON "seo_chat_threads" USING btree ("website_project_id","user_id");--> statement-breakpoint
CREATE INDEX "seo_chat_messages_thread_idx" ON "seo_chat_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "seo_chat_messages_run_idx" ON "seo_chat_messages" USING btree ("agent_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_chat_memory_project_uidx" ON "project_chat_memory" USING btree ("website_project_id");
