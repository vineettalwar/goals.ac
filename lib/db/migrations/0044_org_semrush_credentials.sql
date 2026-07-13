ALTER TABLE "organizations" ADD COLUMN "encrypted_semrush_api_key" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "semrush_database" text DEFAULT 'us';
