ALTER TABLE "organizations" ADD COLUMN "encrypted_openai_api_key" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "encrypted_anthropic_api_key" text;
