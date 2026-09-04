CREATE TABLE `onboarding_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`organization_id` integer,
	`company_id` integer,
	`website_project_id` integer,
	`invite_id` integer,
	`vertical` text,
	`current_step` text DEFAULT 'firm_name' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`step_status` text DEFAULT '{}' NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invite_id`) REFERENCES `org_invites`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `onboarding_sessions_user_id_idx` ON `onboarding_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `onboarding_sessions_org_id_idx` ON `onboarding_sessions` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_sessions_active_user_uidx` ON `onboarding_sessions` (`user_id`) WHERE "onboarding_sessions"."completed_at" is null;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_org_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer,
	`email` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`kind` text DEFAULT 'member' NOT NULL,
	`prefill` text,
	`assigned_project_id` integer,
	`token` text,
	`token_hash` text,
	`invited_by_user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	`last_sent_at` integer,
	`send_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_org_invites`("id", "organization_id", "email", "role", "kind", "prefill", "assigned_project_id", "token", "token_hash", "invited_by_user_id", "expires_at", "accepted_at", "revoked_at", "last_sent_at", "send_count", "created_at") SELECT "id", "organization_id", "email", "role", "kind", "prefill", "assigned_project_id", "token", "token_hash", "invited_by_user_id", "expires_at", "accepted_at", "revoked_at", "last_sent_at", "send_count", "created_at" FROM `org_invites`;--> statement-breakpoint
DROP TABLE `org_invites`;--> statement-breakpoint
ALTER TABLE `__new_org_invites` RENAME TO `org_invites`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `org_invites_token_uidx` ON `org_invites` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `org_invites_token_hash_uidx` ON `org_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `org_invites_org_id_idx` ON `org_invites` (`organization_id`);--> statement-breakpoint
CREATE INDEX `org_invites_email_idx` ON `org_invites` (`email`);--> statement-breakpoint
CREATE INDEX `org_invites_kind_idx` ON `org_invites` (`kind`);--> statement-breakpoint
ALTER TABLE `organizations` ADD `vertical` text;--> statement-breakpoint
ALTER TABLE `publish_records` ADD `quality_score` integer;--> statement-breakpoint
ALTER TABLE `publish_records` ADD `readiness_blockers` text;--> statement-breakpoint
ALTER TABLE `publish_records` ADD `readiness_warnings` text;