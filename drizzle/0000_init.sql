CREATE TABLE `inquiries` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','read','archived') NOT NULL DEFAULT 'new',
	`alert_status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`alert_attempts` int NOT NULL DEFAULT 0,
	`alert_error` varchar(500),
	`alert_claimed_at` timestamp,
	`alerted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`read_at` timestamp,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(100) NOT NULL,
	`value` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_created` ON `inquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_alert` ON `inquiries` (`alert_status`,`alert_attempts`);