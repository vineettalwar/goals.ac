CREATE TABLE `content_piece_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_piece_id` integer NOT NULL,
	`version_number` integer NOT NULL,
	`title` text NOT NULL,
	`body_markdown` text DEFAULT '' NOT NULL,
	`piece_metadata` text,
	`change_type` text NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`content_piece_id`) REFERENCES `content_pieces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_piece_versions_content_piece_id_idx` ON `content_piece_versions` (`content_piece_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_piece_versions_piece_version_idx` ON `content_piece_versions` (`content_piece_id`,`version_number`);