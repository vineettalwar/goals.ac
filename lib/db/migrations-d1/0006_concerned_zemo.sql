CREATE TABLE `platform_bedrock_org_grants` (
	`organization_id` integer PRIMARY KEY NOT NULL,
	`granted_by` integer,
	`granted_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `analytics_property_connections` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `analytics_property_connections` ADD `last_sync_status` text;--> statement-breakpoint
ALTER TABLE `analytics_property_connections` ADD `last_sync_error` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `twitter_client_id` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `encrypted_twitter_client_secret` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `meta_app_id` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `encrypted_meta_app_secret` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `bluesky_client_name` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `encrypted_bluesky_oauth_private_key_jwk` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `encrypted_bedrock_access_key_id` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `encrypted_bedrock_secret_access_key` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `encrypted_bedrock_session_token` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `bedrock_region` text;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `bedrock_model` text;--> statement-breakpoint
ALTER TABLE `search_property_connections` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `search_property_connections` ADD `last_sync_status` text;--> statement-breakpoint
ALTER TABLE `search_property_connections` ADD `last_sync_error` text;