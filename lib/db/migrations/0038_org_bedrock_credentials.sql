ALTER TABLE "organizations" ADD COLUMN "encrypted_bedrock_access_key_id" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "encrypted_bedrock_secret_access_key" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "encrypted_bedrock_session_token" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "bedrock_region" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "bedrock_model" text;
