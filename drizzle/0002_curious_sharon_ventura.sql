ALTER TABLE `mp_council_members` ADD `member_type` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
UPDATE `mp_council_members` SET `member_type` = 'president' WHERE `is_president` = 1;
