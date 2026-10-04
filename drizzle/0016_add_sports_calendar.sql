ALTER TABLE `mp_sports_page_config` ADD `calendar_image_id` integer REFERENCES `mp_media`(`id`);--> statement-breakpoint
ALTER TABLE `mp_sports_page_config` ADD `calendar_title` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `mp_sports_page_config` ADD `calendar_description` text DEFAULT '';
