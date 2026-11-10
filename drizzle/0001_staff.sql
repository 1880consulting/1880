CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_type` enum('staff','client','system') NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(64) NOT NULL,
	`target` varchar(400),
	`detail` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(400) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `rate_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_sessions` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `staff_sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `staff_tokens` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`purpose` enum('login','invite','reset') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	CONSTRAINT `staff_tokens_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `staff_users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200) NOT NULL,
	`password_hash` varchar(255),
	`role` enum('owner','editor') NOT NULL DEFAULT 'editor',
	`status` enum('invited','active','disabled') NOT NULL DEFAULT 'invited',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_login_at` timestamp,
	CONSTRAINT `staff_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `audit_log_time` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_actor` ON `audit_log` (`actor_id`);--> statement-breakpoint
CREATE INDEX `rate_limits_key_time` ON `rate_limits` (`key`,`created_at`);--> statement-breakpoint
CREATE INDEX `staff_sessions_user` ON `staff_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `staff_tokens_user` ON `staff_tokens` (`user_id`,`purpose`);