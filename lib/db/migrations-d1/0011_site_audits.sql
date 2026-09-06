CREATE TABLE `site_audits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL,
	`start_url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`max_pages` integer DEFAULT 50 NOT NULL,
	`pages_crawled` integer DEFAULT 0 NOT NULL,
	`crawl_complete` integer DEFAULT false NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`website_project_id`) REFERENCES `website_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `site_audit_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_audit_id` integer NOT NULL,
	`url` text NOT NULL,
	`status_code` integer,
	`fetch_class` text DEFAULT 'ok' NOT NULL,
	`title` text,
	`meta_description` text,
	`word_count` integer DEFAULT 0 NOT NULL,
	`crawl_depth` integer,
	`from_sitemap` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`site_audit_id`) REFERENCES `site_audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `site_audit_issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_audit_id` integer NOT NULL,
	`issue_type` text NOT NULL,
	`severity` text NOT NULL,
	`page_url` text NOT NULL,
	`title` text NOT NULL,
	`explanation` text NOT NULL,
	`how_to_fix` text NOT NULL,
	`details` text,
	FOREIGN KEY (`site_audit_id`) REFERENCES `site_audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `site_audits_project_idx` ON `site_audits` (`website_project_id`);--> statement-breakpoint
CREATE INDEX `site_audit_pages_audit_idx` ON `site_audit_pages` (`site_audit_id`);--> statement-breakpoint
CREATE INDEX `site_audit_issues_audit_idx` ON `site_audit_issues` (`site_audit_id`);--> statement-breakpoint
CREATE INDEX `site_audit_issues_severity_idx` ON `site_audit_issues` (`site_audit_id`,`severity`);
