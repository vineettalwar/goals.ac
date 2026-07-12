ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_provider" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ollama_base_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ollama_model" text;
