CREATE TABLE `media` (
	`id` varchar(36) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mime` varchar(50) NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`bytes` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`alt` varchar(300) NOT NULL DEFAULT '',
	`focal_x` int NOT NULL DEFAULT 500,
	`focal_y` int NOT NULL DEFAULT 500,
	`rev` int NOT NULL DEFAULT 1,
	`widths` json NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_blobs` (
	`key` varchar(200) NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`bytes` int NOT NULL,
	`data` longblob NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_blobs_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE INDEX `media_sha256` ON `media` (`sha256`);--> statement-breakpoint
CREATE INDEX `media_created` ON `media` (`created_at`);