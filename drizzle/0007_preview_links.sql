CREATE TABLE `preview_links` (
	`id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`entry_id` varchar(36) NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	CONSTRAINT `preview_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `preview_links_token` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `preview_links_entry` ON `preview_links` (`entry_id`);