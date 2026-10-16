CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `appraisal` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`customer_id` text,
	`customer_name` text NOT NULL,
	`customer_phone` text,
	`vin` text NOT NULL,
	`year` integer,
	`make` text,
	`model` text,
	`trim` text,
	`status` text NOT NULL,
	`declared_km` integer NOT NULL,
	`declared_condition` text NOT NULL,
	`estimate_low` integer,
	`estimate_high` integer,
	`facts` text NOT NULL,
	`comps` text,
	`market_read_at` integer NOT NULL,
	`calls` text NOT NULL,
	`odometer_km` integer,
	`checklist` text NOT NULL,
	`lot_note` text,
	`appraiser_id` text,
	`walked_at` integer,
	`desk` text,
	`offer` integer,
	`offer_note` text,
	`offered_by` text,
	`offered_at` integer,
	`responded_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`appraiser_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`offered_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appraisal_number_unique` ON `appraisal` (`number`);--> statement-breakpoint
CREATE INDEX `appraisal_status_idx` ON `appraisal` (`status`);--> statement-breakpoint
CREATE INDEX `appraisal_customer_idx` ON `appraisal` (`customer_id`);--> statement-breakpoint
CREATE TABLE `appraisal_event` (
	`id` text PRIMARY KEY NOT NULL,
	`appraisal_id` text NOT NULL,
	`at` integer NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	FOREIGN KEY (`appraisal_id`) REFERENCES `appraisal`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_appraisal_idx` ON `appraisal_event` (`appraisal_id`);--> statement-breakpoint
CREATE TABLE `photo` (
	`id` text PRIMARY KEY NOT NULL,
	`appraisal_id` text NOT NULL,
	`slot` text NOT NULL,
	`file` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`appraisal_id`) REFERENCES `appraisal`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photo_slot_idx` ON `photo` (`appraisal_id`,`slot`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'customer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
