CREATE TABLE `mp_announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`href` text,
	`date` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`event_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `mp_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mp_announcements_date_idx` ON `mp_announcements` (`date`);--> statement-breakpoint
CREATE INDEX `mp_announcements_pinned_idx` ON `mp_announcements` (`pinned`);--> statement-breakpoint
CREATE TABLE `mp_attendees` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`event_id` integer NOT NULL,
	`ticket_code` text NOT NULL,
	`checked_in_at` text,
	`checked_in_by_user_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `mp_event_registrations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `mp_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checked_in_by_user_id`) REFERENCES `mp_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_attendees_ticket_idx` ON `mp_attendees` (`ticket_code`);--> statement-breakpoint
CREATE INDEX `mp_attendees_event_idx` ON `mp_attendees` (`event_id`);--> statement-breakpoint
CREATE TABLE `mp_clubs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_id` integer,
	`blurb` text NOT NULL,
	`join_url` text,
	`tags` text DEFAULT '[]',
	`members` integer,
	`lead_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`logo_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_clubs_slug_idx` ON `mp_clubs` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `mp_clubs_name_idx` ON `mp_clubs` (`name`);--> statement-breakpoint
CREATE TABLE `mp_council_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`program` text NOT NULL,
	`photo_id` integer,
	`email` text,
	`linkedin` text,
	`message` text,
	`quote` text,
	`is_president` integer DEFAULT false NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 99 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mp_event_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount_in_paise` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`razorpay_order_id` text,
	`razorpay_payment_id` text,
	`razorpay_signature` text,
	`payment_status` text DEFAULT 'none' NOT NULL,
	`meta` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `mp_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mp_registrations_event_idx` ON `mp_event_registrations` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mp_registrations_payment_idx` ON `mp_event_registrations` (`razorpay_payment_id`);--> statement-breakpoint
CREATE TABLE `mp_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category` text NOT NULL,
	`date` text NOT NULL,
	`end_date` text,
	`venue` text NOT NULL,
	`excerpt` text NOT NULL,
	`description` text DEFAULT '',
	`banner_id` integer,
	`video_url` text,
	`registration_url` text,
	`attendees` integer,
	`featured` integer DEFAULT false NOT NULL,
	`organizer_id` integer,
	`club_id` integer,
	`registration_enabled` integer DEFAULT false NOT NULL,
	`price_in_paise` integer DEFAULT 0 NOT NULL,
	`capacity` integer,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`banner_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organizer_id`) REFERENCES `mp_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `mp_clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_events_slug_idx` ON `mp_events` (`slug`);--> statement-breakpoint
CREATE INDEX `mp_events_status_idx` ON `mp_events` (`status`);--> statement-breakpoint
CREATE INDEX `mp_events_date_idx` ON `mp_events` (`date`);--> statement-breakpoint
CREATE INDEX `mp_events_category_idx` ON `mp_events` (`category`);--> statement-breakpoint
CREATE TABLE `mp_faqs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text DEFAULT '',
	`page` text DEFAULT 'council' NOT NULL,
	`sort_order` integer DEFAULT 99 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mp_highlights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`image_id` integer,
	`alt` text NOT NULL,
	`caption` text,
	`span` text DEFAULT 'md' NOT NULL,
	`sort_order` integer DEFAULT 99 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mp_homepage_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hero` text,
	`stats_kicker` text,
	`stats` text DEFAULT '[]',
	`manifesto_kicker` text,
	`manifesto_lines` text DEFAULT '[]',
	`manifesto_footer` text,
	`quick_actions` text DEFAULT '[]',
	`closing_cta` text,
	`flagship_event_id` integer,
	`featured_club_ids` text DEFAULT '[]',
	`vault_story_ids` text DEFAULT '[]',
	`tagline` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`flagship_event_id`) REFERENCES `mp_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mp_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`alt` text NOT NULL,
	`url` text NOT NULL,
	`filename` text,
	`mime_type` text,
	`filesize` integer,
	`width` integer,
	`height` integer,
	`credit` text,
	`tags` text DEFAULT '[]',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mp_recaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`event_id` integer,
	`kicker` text,
	`blurb` text,
	`published_at` text,
	`hero_media_id` integer,
	`hero_video_url` text,
	`gallery` text DEFAULT '[]',
	`stats` text DEFAULT '[]',
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `mp_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hero_media_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_recaps_slug_idx` ON `mp_recaps` (`slug`);--> statement-breakpoint
CREATE TABLE `mp_site_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_name` text DEFAULT 'Woxsen Student Council' NOT NULL,
	`tagline` text,
	`contact_email` text,
	`instagram_url` text,
	`linkedin_url` text,
	`campus` text,
	`grievance_categories` text DEFAULT '[]',
	`grievance_mail_to` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mp_support_channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`purpose` text NOT NULL,
	`description` text NOT NULL,
	`icon` text DEFAULT 'LifeBuoy' NOT NULL,
	`owned_by` text NOT NULL,
	`bring` text DEFAULT '[]',
	`council_role` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mp_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`club_id` integer,
	`phone` text,
	`failed_login_count` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_users_email_idx` ON `mp_users` (`email`);