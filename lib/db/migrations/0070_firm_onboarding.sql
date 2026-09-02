-- Firm onboarding: secure invites for organizations that do not exist yet,
-- plus resumable server-side onboarding state.

-- org_invites: `firm` invites carry no organization until they are accepted,
-- because organizations.owner_id is NOT NULL and needs the owner user to exist first.
ALTER TABLE "org_invites" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "org_invites" ALTER COLUMN "token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "org_invites" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_invites" ADD COLUMN IF NOT EXISTS "prefill" jsonb;--> statement-breakpoint
ALTER TABLE "org_invites" ADD COLUMN IF NOT EXISTS "token_hash" text;--> statement-breakpoint
ALTER TABLE "org_invites" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org_invites" ADD COLUMN IF NOT EXISTS "last_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org_invites" ADD COLUMN IF NOT EXISTS "send_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "org_invites_token_hash_uidx" ON "org_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_invites_kind_idx" ON "org_invites" USING btree ("kind");--> statement-breakpoint

-- organizations: vertical drives onboarding presets and tone guardrails.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "vertical" text;--> statement-breakpoint

-- Resumable onboarding state. One unfinished session per user at a time.
CREATE TABLE IF NOT EXISTS "onboarding_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"company_id" integer,
	"website_project_id" integer,
	"invite_id" integer,
	"vertical" text,
	"current_step" text DEFAULT 'firm_name' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"step_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_website_project_id_website_projects_id_fk" FOREIGN KEY ("website_project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_invite_id_org_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."org_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_user_id_idx" ON "onboarding_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sessions_org_id_idx" ON "onboarding_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_sessions_active_user_uidx" ON "onboarding_sessions" USING btree ("user_id") WHERE "onboarding_sessions"."completed_at" is null;
