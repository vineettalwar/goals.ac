CREATE TABLE `integration_health_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`organization_id` integer,
	`platform` text NOT NULL,
	`alert_type` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`dismissed_at` integer,
	`resolved_at` integer,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `integration_health_alerts_project_status_idx` ON `integration_health_alerts` (`website_project_id`,`status`);--> statement-breakpoint
CREATE INDEX `integration_health_alerts_org_status_idx` ON `integration_health_alerts` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `plan_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`price_amount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'eur' NOT NULL,
	`stripe_price_id` text,
	`monthly_credits` integer,
	`is_offered` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_by` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
