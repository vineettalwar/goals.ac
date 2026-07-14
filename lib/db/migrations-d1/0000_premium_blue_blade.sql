CREATE TABLE `analytics_property_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`provider` text NOT NULL,
	`property_id` text NOT NULL,
	`property_name` text,
	`stream_id` text,
	`account_email` text,
	`encrypted_tokens` text NOT NULL,
	`property_verified` integer DEFAULT false NOT NULL,
	`connected_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_property_connections_project_provider_idx` ON `analytics_property_connections` (`project_id`,`provider`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`scopes` text DEFAULT '["render:preview"]' NOT NULL,
	`rate_limit_per_hour` integer DEFAULT 60 NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_keys_org_id_idx` ON `api_keys` (`organization_id`);--> statement-breakpoint
CREATE INDEX `api_keys_key_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `article_idea_imports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`source_type` text NOT NULL,
	`file_name` text,
	`row_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`imported_by_user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`imported_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `article_idea_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`spreadsheet_id` text NOT NULL,
	`sheet_name` text,
	`sheet_gid` text,
	`encrypted_config` text,
	`column_mapping` text,
	`last_synced_at` integer,
	`sync_status` text DEFAULT 'idle' NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`sync_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `brand_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`company_name` text DEFAULT '' NOT NULL,
	`industry` text DEFAULT '' NOT NULL,
	`target_audience` text DEFAULT '' NOT NULL,
	`voice_tone` text DEFAULT '' NOT NULL,
	`primary_keywords` text DEFAULT '[]' NOT NULL,
	`competitor_urls` text DEFAULT '[]' NOT NULL,
	`writing_examples` text DEFAULT '[]' NOT NULL,
	`brand_glossary` text DEFAULT '[]' NOT NULL,
	`anti_patterns` text DEFAULT '[]' NOT NULL,
	`typical_structure` text DEFAULT '' NOT NULL,
	`do_words` text DEFAULT '[]' NOT NULL,
	`dont_words` text DEFAULT '[]' NOT NULL,
	`brand_colors` text DEFAULT '[]' NOT NULL,
	`product_offerings` text DEFAULT '[]' NOT NULL,
	`brand_memory` text,
	`platform_voices` text,
	`brand_voice_skill` text DEFAULT '' NOT NULL,
	`skill_locked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_profiles_website_project_id_unique` ON `brand_profiles` (`website_project_id`);--> statement-breakpoint
CREATE TABLE `brand_voice_chunks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`website_project_id` integer NOT NULL,
	`chunk_index` integer DEFAULT 0 NOT NULL,
	`text` text NOT NULL,
	`token_count` integer DEFAULT 0 NOT NULL,
	`embedding` text NOT NULL,
	`embedding_model` text DEFAULT 'text-embedding-004' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `brand_voice_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `brand_voice_chunks_project_idx` ON `brand_voice_chunks` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `brand_voice_chunks_source_idx` ON `brand_voice_chunks` (`source_id`);--> statement-breakpoint
CREATE TABLE `brand_voice_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`raw_text` text,
	`metadata` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`ingested_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `brand_voice_sources_project_idx` ON `brand_voice_sources` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `brand_voice_sources_project_type_idx` ON `brand_voice_sources` (`website_project_id`,`source_type`);--> statement-breakpoint
CREATE TABLE `briefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`target_keyword_cluster` text,
	`search_intent` text,
	`funnel_stage` text,
	`working_title` text NOT NULL,
	`outline` text,
	`angle` text,
	`cta` text,
	`internal_link_targets` text,
	`success_metric` text,
	`format` text,
	`word_count` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `briefs_goal_id_idx` ON `briefs` (`goal_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`website_url` text NOT NULL,
	`industry` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`target_audience` text DEFAULT '' NOT NULL,
	`competitor_urls` text DEFAULT '[]' NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`humanization_level` text DEFAULT 'light' NOT NULL,
	`writing_sample` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `companies_user_id_idx` ON `companies` (`user_id`);--> statement-breakpoint
CREATE TABLE `competitor_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer,
	`competitor_url` text NOT NULL,
	`industry` text NOT NULL,
	`location` text NOT NULL,
	`stage` text NOT NULL,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `contact_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_pieces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`brief_id` integer,
	`content_item_id` integer,
	`parent_piece_id` integer,
	`format_type` text NOT NULL,
	`title` text NOT NULL,
	`target_keyword` text DEFAULT '' NOT NULL,
	`body_markdown` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`planned_date` text,
	`scheduled_at` integer,
	`approval_status` text DEFAULT 'draft' NOT NULL,
	`approved_by_user_id` integer,
	`approved_at` integer,
	`evergreen_config` text,
	`queue_position` integer,
	`published_url` text,
	`publish_platform` text,
	`publish_error` text,
	`cache_key` text,
	`piece_metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`brief_id`) REFERENCES `briefs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_pieces_website_project_id_idx` ON `content_pieces` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `content_pieces_brief_id_idx` ON `content_pieces` (`brief_id`);--> statement-breakpoint
CREATE INDEX `content_pieces_content_item_id_idx` ON `content_pieces` (`content_item_id`);--> statement-breakpoint
CREATE INDEX `content_pieces_scheduled_at_idx` ON `content_pieces` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `content_pieces_approval_status_idx` ON `content_pieces` (`approval_status`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`strategy_id` integer NOT NULL,
	`day` integer NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`topic_angle` text NOT NULL,
	`primary_keyword` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`strategy_id`) REFERENCES `content_strategies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `content_strategies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roadmap_id` integer NOT NULL,
	`website_project_id` integer,
	`industry` text NOT NULL,
	`location` text NOT NULL,
	`stage` text NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`entry_type` text NOT NULL,
	`amount` integer NOT NULL,
	`usage_event_id` integer,
	`job_id` text,
	`run_id` text,
	`meta` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usage_event_id`) REFERENCES `usage_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_ledger_run_id_unique` ON `credit_ledger` (`run_id`) WHERE "credit_ledger"."run_id" is not null;--> statement-breakpoint
CREATE TABLE `ga4_page_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`connection_id` integer NOT NULL,
	`page_path` text NOT NULL,
	`date` text NOT NULL,
	`sessions` integer DEFAULT 0 NOT NULL,
	`users` integer DEFAULT 0 NOT NULL,
	`pageviews` integer DEFAULT 0 NOT NULL,
	`engagement_rate` real DEFAULT 0 NOT NULL,
	`avg_session_duration` real DEFAULT 0 NOT NULL,
	`bounce_rate` real DEFAULT 0 NOT NULL,
	`ingested_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `analytics_property_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ga4_page_metrics_project_page_path_date_idx` ON `ga4_page_metrics` (`project_id`,`page_path`,`date`);--> statement-breakpoint
CREATE TABLE `geo_audits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roadmap_id` integer,
	`website_project_id` integer,
	`url` text NOT NULL,
	`geo_score` integer NOT NULL,
	`issues` text NOT NULL,
	`page_title` text,
	`meta_description` text,
	`has_schema_org` integer DEFAULT false NOT NULL,
	`schema_types` text DEFAULT '[]' NOT NULL,
	`h1_count` integer DEFAULT 0 NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`images_missing_alt` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`objective` text NOT NULL,
	`target_metric` text NOT NULL,
	`baseline` text,
	`deadline` integer,
	`icp` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `goals_project_id_idx` ON `goals` (`project_id`);--> statement-breakpoint
CREATE TABLE `gsc_search_queries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`connection_id` integer NOT NULL,
	`query` text NOT NULL,
	`page` text,
	`date` text NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`ctr` real DEFAULT 0 NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`ingested_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `search_property_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gsc_search_queries_project_query_page_date_idx` ON `gsc_search_queries` (`project_id`,`query`,`page`,`date`);--> statement-breakpoint
CREATE TABLE `industries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `industries_name_unique` ON `industries` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `industries_slug_unique` ON `industries` (`slug`);--> statement-breakpoint
CREATE TABLE `integration_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`encrypted_secret` text NOT NULL,
	`default_status` text DEFAULT 'draft' NOT NULL,
	`last_tested_at` integer,
	`last_test_ok` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `keyword_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer,
	`keywords` text NOT NULL,
	`website_url` text,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `keyword_opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`keyword` text NOT NULL,
	`source` text NOT NULL,
	`competitor_url` text,
	`estimated_volume` text,
	`difficulty` text,
	`opportunity_score` integer DEFAULT 0 NOT NULL,
	`intent` text,
	`suggested_title` text NOT NULL,
	`suggested_angle` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`content_item_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `keyword_rank_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`tracked_keyword_id` integer NOT NULL,
	`keyword` text NOT NULL,
	`previous_position` integer,
	`current_position` integer,
	`change_amount` integer NOT NULL,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tracked_keyword_id`) REFERENCES `tracked_keywords`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `keyword_rank_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracked_keyword_id` integer NOT NULL,
	`position` integer,
	`ranking_url` text,
	`serp_features` text DEFAULT '{}' NOT NULL,
	`provider` text DEFAULT 'dataforseo' NOT NULL,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`tracked_keyword_id`) REFERENCES `tracked_keywords`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `keyword_rank_snapshots_tracked_keyword_checked_idx` ON `keyword_rank_snapshots` (`tracked_keyword_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `lead_captures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roadmap_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company_url` text NOT NULL,
	`webhook_sent` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_captures_roadmap_email_unique` ON `lead_captures` (`roadmap_id`,`email`);--> statement-breakpoint
CREATE TABLE `llm_visibility_prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`prompt` text NOT NULL,
	`category` text DEFAULT 'custom' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `llm_visibility_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`prompt_id` integer,
	`prompt` text NOT NULL,
	`engine` text NOT NULL,
	`cited` integer DEFAULT false NOT NULL,
	`citation_url` text,
	`competitors_mentioned` text DEFAULT '[]' NOT NULL,
	`response_snippet` text,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prompt_id`) REFERENCES `llm_visibility_prompts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`country` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_name_unique` ON `locations` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `locations_slug_unique` ON `locations` (`slug`);--> statement-breakpoint
CREATE TABLE `marketing_personas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`age_range` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`pain_points` text DEFAULT '[]' NOT NULL,
	`goals` text DEFAULT '[]' NOT NULL,
	`preferred_content` text DEFAULT '[]' NOT NULL,
	`demographics` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `org_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`actor_user_id` integer,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`metadata` text,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `org_audit_log_org_id_idx` ON `org_audit_log` (`organization_id`);--> statement-breakpoint
CREATE INDEX `org_audit_log_created_at_idx` ON `org_audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `org_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`assigned_project_id` integer,
	`token` text NOT NULL,
	`invited_by_user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `org_invites_token_uidx` ON `org_invites` (`token`);--> statement-breakpoint
CREATE INDEX `org_invites_org_id_idx` ON `org_invites` (`organization_id`);--> statement-breakpoint
CREATE INDEX `org_invites_email_idx` ON `org_invites` (`email`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`assigned_project_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_members_org_user_uidx` ON `organization_members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `organization_members_user_id_idx` ON `organization_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `organization_members_assigned_project_id_idx` ON `organization_members` (`assigned_project_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`plan` text DEFAULT 'starter' NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`subscription_status` text,
	`stripe_price_id` text,
	`current_period_end` integer,
	`owner_id` integer NOT NULL,
	`company_id` integer,
	`encrypted_gemini_key` text,
	`encrypted_bedrock_access_key_id` text,
	`encrypted_bedrock_secret_access_key` text,
	`encrypted_bedrock_session_token` text,
	`bedrock_region` text,
	`bedrock_model` text,
	`encrypted_openai_api_key` text,
	`encrypted_anthropic_api_key` text,
	`ai_provider` text,
	`ollama_base_url` text,
	`ollama_model` text,
	`encrypted_semrush_api_key` text,
	`semrush_database` text DEFAULT 'us',
	`encrypted_deepl_api_key` text,
	`encrypted_stock_credentials` text,
	`suspended_at` integer,
	`suspended_reason` text,
	`security_settings` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `organizations_owner_id_idx` ON `organizations` (`owner_id`);--> statement-breakpoint
CREATE INDEX `organizations_company_id_idx` ON `organizations` (`company_id`);--> statement-breakpoint
CREATE INDEX `organizations_stripe_customer_id_idx` ON `organizations` (`stripe_customer_id`);--> statement-breakpoint
CREATE TABLE `plan_quota_config` (
	`plan_id` text PRIMARY KEY NOT NULL,
	`articles_per_month` integer,
	`roadmaps_per_month` integer,
	`sites` integer,
	`updated_by` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform_enabled` integer DEFAULT true NOT NULL,
	`ai_generation_enabled` integer DEFAULT true NOT NULL,
	`maintenance_message` text,
	`signups_enabled` integer DEFAULT false NOT NULL,
	`stripe_billing_enabled` integer DEFAULT false NOT NULL,
	`google_integrations_enabled` integer DEFAULT true NOT NULL,
	`bing_webmaster_enabled` integer DEFAULT true NOT NULL,
	`social_publishing_enabled` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT true NOT NULL,
	`encrypted_stripe_secret_key` text,
	`encrypted_stripe_webhook_secret` text,
	`stripe_price_growth_monthly` text,
	`stripe_price_scale_monthly` text,
	`encrypted_stripe_connect_access_token` text,
	`encrypted_stripe_connect_refresh_token` text,
	`stripe_connect_account_id` text,
	`stripe_connect_livemode` integer,
	`stripe_connect_connected_at` integer,
	`encrypted_resend_api_key` text,
	`resend_from_email` text,
	`encrypted_unsplash_access_key` text,
	`encrypted_pexels_api_key` text,
	`updated_by` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `project_roadmaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`roadmap_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_roadmaps_unique` ON `project_roadmaps` (`project_id`,`roadmap_id`);--> statement-breakpoint
CREATE TABLE `publish_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_piece_id` integer NOT NULL,
	`website_project_id` integer NOT NULL,
	`provider` text NOT NULL,
	`connection_id` integer,
	`idempotency_key` text NOT NULL,
	`remote_id` text,
	`remote_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`content_piece_id`) REFERENCES `content_pieces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publish_records_idempotency_uidx` ON `publish_records` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `publish_records_piece_id_idx` ON `publish_records` (`content_piece_id`);--> statement-breakpoint
CREATE INDEX `publish_records_project_id_idx` ON `publish_records` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `publish_records_provider_idx` ON `publish_records` (`provider`);--> statement-breakpoint
CREATE TABLE `roadmaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`industry` text NOT NULL,
	`location` text NOT NULL,
	`stage` text NOT NULL,
	`content` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roadmaps_slug_unique` ON `roadmaps` (`slug`);--> statement-breakpoint
CREATE TABLE `scheduled_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`persona_id` integer,
	`title` text,
	`body_markdown` text,
	`meta_description` text,
	`primary_keyword` text,
	`secondary_keywords` text DEFAULT '[]' NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_date` text,
	`published_url` text,
	`wordpress_post_id` integer,
	`error_message` text,
	`article_metadata` text,
	`humanized` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persona_id`) REFERENCES `marketing_personas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `search_property_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`provider` text NOT NULL,
	`property_url` text,
	`account_email` text,
	`encrypted_tokens` text NOT NULL,
	`property_verified` integer DEFAULT false NOT NULL,
	`connected_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_property_connections_project_provider_idx` ON `search_property_connections` (`project_id`,`provider`);--> statement-breakpoint
CREATE TABLE `seo_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roadmap_id` integer,
	`website_project_id` integer,
	`brand_name` text NOT NULL,
	`website_url` text NOT NULL,
	`industry` text NOT NULL,
	`location` text NOT NULL,
	`stage` text NOT NULL,
	`title` text NOT NULL,
	`meta_description` text NOT NULL,
	`primary_keyword` text NOT NULL,
	`secondary_keywords` text DEFAULT '[]' NOT NULL,
	`content` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`user_agent` text,
	`ip` text,
	`expires_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_hash_unique` ON `sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `social_post_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_piece_id` integer NOT NULL,
	`platform` text NOT NULL,
	`remote_post_id` text,
	`impressions` integer,
	`likes` integer,
	`comments` integer,
	`shares` integer,
	`clicks` integer,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`content_piece_id`) REFERENCES `content_pieces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `social_post_metrics_content_piece_id_idx` ON `social_post_metrics` (`content_piece_id`);--> statement-breakpoint
CREATE INDEX `social_post_metrics_platform_idx` ON `social_post_metrics` (`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `social_post_metrics_piece_platform_uidx` ON `social_post_metrics` (`content_piece_id`,`platform`);--> statement-breakpoint
CREATE TABLE `tracked_keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`keyword` text NOT NULL,
	`target_url` text,
	`location` text DEFAULT 'United States' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`device` text DEFAULT 'desktop' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_checked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tracked_keywords_website_project_id_idx` ON `tracked_keywords` (`website_project_id`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`company_id` integer,
	`event_type` text NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_usd` text DEFAULT '0' NOT NULL,
	`used_byok` integer DEFAULT false NOT NULL,
	`tier` text,
	`provider` text,
	`model` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`google_id` text,
	`name` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`avatar_url` text,
	`encrypted_gemini_key` text,
	`ai_provider` text,
	`ollama_base_url` text,
	`ollama_model` text,
	`plan` text DEFAULT 'starter' NOT NULL,
	`signup_referrer` text,
	`password_reset_token` text,
	`password_reset_expires` integer,
	`mfa_enabled` integer DEFAULT false NOT NULL,
	`encrypted_totp_secret` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE TABLE `waitlist_signups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`feature_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_email_feature_idx` ON `waitlist_signups` (`email`,`feature_key`);--> statement-breakpoint
CREATE TABLE `website_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`organization_id` integer,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`sitemap_url` text,
	`page_count` integer DEFAULT 0 NOT NULL,
	`crawl_status` text DEFAULT 'pending' NOT NULL,
	`crawl_data` text,
	`scrape_status` text,
	`scrape_data` text,
	`cms_integrations` text,
	`content_style` text,
	`autopilot_settings` text,
	`visibility_settings` text,
	`publishing_settings` text,
	`social_schedule_settings` text,
	`social_history_sync_meta` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `website_projects_user_id_idx` ON `website_projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `website_projects_organization_id_idx` ON `website_projects` (`organization_id`);--> statement-breakpoint
CREATE TABLE `wordpress_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`site_url` text NOT NULL,
	`username` text NOT NULL,
	`encrypted_app_password` text NOT NULL,
	`default_category_id` integer,
	`default_status` text DEFAULT 'draft' NOT NULL,
	`last_tested_at` integer,
	`is_verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wordpress_connections_company_id_unique` ON `wordpress_connections` (`company_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`owner_id` integer NOT NULL,
	`organization_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_organization_id_unique` ON `workspaces` (`organization_id`);