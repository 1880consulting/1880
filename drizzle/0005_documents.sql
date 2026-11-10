CREATE TABLE `document_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`client_user_id` varchar(36) NOT NULL,
	`kind` enum('view','download') NOT NULL,
	`file_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_files` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`purpose` enum('interactive','file','attachment') NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mime` varchar(120) NOT NULL,
	`bytes` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`doc` json NOT NULL,
	`author_id` varchar(36),
	`note` varchar(200),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `document_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`kind` enum('report','proposal','other') NOT NULL DEFAULT 'report',
	`format` enum('blocks','interactive','file') NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`draft_version_id` varchar(36),
	`published_version_id` varchar(36),
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`published_at` timestamp,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `document_events_doc` ON `document_events` (`document_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `document_events_user` ON `document_events` (`client_user_id`,`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `document_files_doc` ON `document_files` (`document_id`);--> statement-breakpoint
CREATE INDEX `document_versions_doc` ON `document_versions` (`document_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `documents_tenant` ON `documents` (`tenant_id`,`status`,`published_at`);