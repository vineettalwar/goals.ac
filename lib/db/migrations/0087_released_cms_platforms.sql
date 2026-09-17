ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "released_cms_platforms" jsonb DEFAULT '["wordpress"]'::jsonb NOT NULL;
