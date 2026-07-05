ALTER TABLE "companies" ADD COLUMN "humanization_level" text DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "writing_sample" text;--> statement-breakpoint
ALTER TABLE "scheduled_articles" ADD COLUMN "humanized" boolean DEFAULT false NOT NULL;