ALTER TABLE "brand_profiles" ADD COLUMN "writing_examples" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "brand_glossary" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "anti_patterns" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "typical_structure" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "do_words" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "dont_words" text[] DEFAULT '{}' NOT NULL;