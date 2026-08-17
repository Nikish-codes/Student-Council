CREATE TABLE `mp_oval_menu_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_date` text NOT NULL,
	`week_start` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`meals` text DEFAULT '{"breakfast":[],"lunch":[],"dinner":[]}' NOT NULL,
	`source_name` text,
	`source_mime_type` text,
	`import_method` text DEFAULT 'manual' NOT NULL,
	`imported_by_user_id` integer,
	`approved_by_user_id` integer,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`imported_by_user_id`) REFERENCES `mp_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_user_id`) REFERENCES `mp_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_oval_menu_days_date_idx` ON `mp_oval_menu_days` (`menu_date`);--> statement-breakpoint
CREATE INDEX `mp_oval_menu_days_week_idx` ON `mp_oval_menu_days` (`week_start`);--> statement-breakpoint
CREATE INDEX `mp_oval_menu_days_status_idx` ON `mp_oval_menu_days` (`status`);