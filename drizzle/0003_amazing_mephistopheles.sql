CREATE TABLE `mp_council_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`blurb` text,
	`parent_id` integer,
	`per_row` integer DEFAULT 4 NOT NULL,
	`card_size` text DEFAULT 'md' NOT NULL,
	`layout` text DEFAULT 'grid' NOT NULL,
	`sort_order` integer DEFAULT 99 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `mp_council_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `mp_council_members` ADD `group_id` integer REFERENCES mp_council_groups(id);--> statement-breakpoint
INSERT INTO `mp_council_groups` (`id`, `title`, `parent_id`, `per_row`, `card_size`, `layout`, `sort_order`) VALUES
  (1, 'The Board',              NULL, 3, 'lg', 'grid',    10),
  (2, 'Vice Presidents',        1,    3, 'lg', 'grid',    10),
  (3, 'Secretaries & Treasurers', 1,  4, 'sm', 'grid',    20),
  (4, 'Core Team',              NULL, 4, 'md', 'grid',    20),
  (5, 'School Representatives', NULL, 4, 'md', 'grid',    30),
  (6, 'Student Council Food Committee', NULL, 4, 'md', 'grid', 40),
  (7, 'Club Presidents',        NULL, 4, 'sm', 'hscroll', 50);--> statement-breakpoint
UPDATE `mp_council_members` SET `group_id` = 2 WHERE `member_type` <> 'president' AND `role` LIKE '%VP%';--> statement-breakpoint
UPDATE `mp_council_members` SET `group_id` = 2 WHERE `member_type` <> 'president' AND `role` LIKE '%Vice President%';
