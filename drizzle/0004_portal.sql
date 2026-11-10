CREATE TABLE `client_sessions` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `client_sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `client_tokens` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`purpose` enum('login','invite') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	CONSTRAINT `client_tokens_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `client_users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_login_at` timestamp,
	CONSTRAINT `client_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`client_user_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`invited_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberships_client_user_id_tenant_id_pk` PRIMARY KEY(`client_user_id`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(63) NOT NULL,
	`name` varchar(200) NOT NULL,
	`logo_media_id` varchar(36),
	`accent_color` varchar(7),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` ADD `tenant_id` varchar(36);--> statement-breakpoint
CREATE INDEX `client_sessions_user` ON `client_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `client_tokens_user` ON `client_tokens` (`user_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `memberships_tenant` ON `memberships` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `audit_log_tenant` ON `audit_log` (`tenant_id`,`created_at`);