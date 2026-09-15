CREATE TABLE `agent_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`user_id` integer,
	`goal_kind` text NOT NULL,
	`goal` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`stop_reason` text,
	`policy` text DEFAULT '{}' NOT NULL,
	`trajectory` text DEFAULT '[]' NOT NULL,
	`credits_spent` integer DEFAULT 0 NOT NULL,
	`content_piece_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`content_piece_id`) REFERENCES `content_pieces`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_runs_project_idx` ON `agent_runs` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `agent_runs_status_idx` ON `agent_runs` (`website_project_id`,`status`);--> statement-breakpoint
CREATE TABLE `agent_action_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`action_type` text NOT NULL,
	`title` text NOT NULL,
	`keyword` text NOT NULL,
	`url` text,
	`evidence` text DEFAULT '[]' NOT NULL,
	`estimated_impact` integer DEFAULT 0 NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`effort` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`opportunity_score` integer DEFAULT 0 NOT NULL,
	`last_run_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`last_run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_action_items_project_idx` ON `agent_action_items` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `agent_action_items_status_idx` ON `agent_action_items` (`website_project_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_action_items_fingerprint_uidx` ON `agent_action_items` (`website_project_id`,`fingerprint`);
