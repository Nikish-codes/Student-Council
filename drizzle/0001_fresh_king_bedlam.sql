CREATE TABLE `mp_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` integer,
	`event_id` integer,
	`action` text NOT NULL,
	`target_id` text,
	`meta` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `mp_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `mp_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mp_audit_event_idx` ON `mp_audit_log` (`event_id`);--> statement-breakpoint
CREATE INDEX `mp_audit_created_idx` ON `mp_audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `mp_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text,
	`channel` text DEFAULT 'system' NOT NULL,
	`template` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`payload` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `mp_event_registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mp_notifications_status_idx` ON `mp_notifications` (`status`);--> statement-breakpoint
CREATE INDEX `mp_notifications_reg_idx` ON `mp_notifications` (`registration_id`);--> statement-breakpoint
ALTER TABLE `mp_attendees` ADD `checked_in_gate` text;--> statement-breakpoint
ALTER TABLE `mp_attendees` ADD `updated_at` text;