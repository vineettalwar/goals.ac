ALTER TABLE "organizations" ADD COLUMN "encrypted_gemini_key" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ai_provider" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ollama_base_url" text;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ollama_model" text;
--> statement-breakpoint
-- Backfill org AI settings from owner user records
UPDATE organizations o
SET
  encrypted_gemini_key = u.encrypted_gemini_key,
  ai_provider = u.ai_provider,
  ollama_base_url = u.ollama_base_url,
  ollama_model = u.ollama_model
FROM users u
WHERE o.owner_id = u.id
  AND (
    u.encrypted_gemini_key IS NOT NULL
    OR u.ai_provider IS NOT NULL
    OR u.ollama_base_url IS NOT NULL
    OR u.ollama_model IS NOT NULL
  );
