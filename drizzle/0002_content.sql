CREATE TABLE `entries` (
	`id` varchar(36) NOT NULL,
	`type` varchar(32) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`published_slug` varchar(200),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`draft_version_id` varchar(36),
	`published_version_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updated_by` varchar(36),
	`published_at` timestamp,
	CONSTRAINT `entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `entries_type_slug` UNIQUE(`type`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `entry_versions` (
	`id` varchar(36) NOT NULL,
	`entry_id` varchar(36) NOT NULL,
	`doc` json NOT NULL,
	`author_id` varchar(36),
	`note` varchar(200),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `entry_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `redirects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`from_path` varchar(300) NOT NULL,
	`to_path` varchar(300) NOT NULL,
	`code` int NOT NULL DEFAULT 308,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `redirects_id` PRIMARY KEY(`id`),
	CONSTRAINT `redirects_from_path_unique` UNIQUE(`from_path`)
);
--> statement-breakpoint
CREATE INDEX `entries_type_status` ON `entries` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `entry_versions_entry` ON `entry_versions` (`entry_id`,`created_at`);