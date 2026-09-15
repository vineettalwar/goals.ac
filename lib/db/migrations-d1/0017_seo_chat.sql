CREATE TABLE `seo_chat_threads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`user_id` integer,
	`title` text DEFAULT 'New chat' NOT NULL,
	`last_agent_run_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`last_agent_run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `seo_chat_threads_project_idx` ON `seo_chat_threads` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `seo_chat_threads_user_idx` ON `seo_chat_threads` (`website_project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `seo_chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`agent_run_id` integer,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `seo_chat_threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `seo_chat_messages_thread_idx` ON `seo_chat_messages` (`thread_id`);--> statement-breakpoint
CREATE INDEX `seo_chat_messages_run_idx` ON `seo_chat_messages` (`agent_run_id`);--> statement-breakpoint
CREATE TABLE `project_chat_memory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`brand_voice_notes` text DEFAULT '' NOT NULL,
	`banned_claims` text DEFAULT '' NOT NULL,
	`last_decisions` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_chat_memory_project_uidx` ON `project_chat_memory` (`website_project_id`);
