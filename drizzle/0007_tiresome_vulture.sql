ALTER TABLE `mp_clubs` ADD `tagline` text;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `about` text;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `cover_id` integer REFERENCES mp_media(id);--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `accent_color` text;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `founded_year` integer;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `activities` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `flagship_event` text;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `videos` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `gallery` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `instagram_url` text;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `linkedin_url` text;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `website_url` text;--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `contact_email` text;--> statement-breakpoint
ALTER TABLE `mp_council_members` ADD `club_id` integer REFERENCES mp_clubs(id);