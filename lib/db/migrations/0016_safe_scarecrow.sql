ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "encrypted_gemini_key" text;--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "scrape_status" text;--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "scrape_data" jsonb;--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "cms_integrations" jsonb;