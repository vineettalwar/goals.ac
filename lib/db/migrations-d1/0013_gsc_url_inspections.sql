CREATE TABLE `gsc_url_inspections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`website_project_id` integer NOT NULL REFERENCES `website_projects`(`id`) ON DELETE cascade,
	`content_piece_id` integer REFERENCES `content_pieces`(`id`) ON DELETE set null,
	`publish_record_id` integer,
	`inspection_url` text NOT NULL,
	`site_url` text NOT NULL,
	`verdict` text,
	`coverage_state` text,
	`indexing_state` text,
	`robots_txt_state` text,
	`page_fetch_state` text,
	`google_canonical` text,
	`user_canonical` text,
	`last_crawl_time` text,
	`inspected_at` integer NOT NULL DEFAULT (unixepoch() * 1000),
	`error_message` text,
	`raw_json` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch() * 1000)
);--> statement-breakpoint
CREATE INDEX `gsc_url_inspections_project_inspected_idx` ON `gsc_url_inspections` (`website_project_id`, `inspected_at`);--> statement-breakpoint
CREATE INDEX `gsc_url_inspections_content_piece_idx` ON `gsc_url_inspections` (`content_piece_id`);
