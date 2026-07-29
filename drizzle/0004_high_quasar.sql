CREATE TABLE `mp_club_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`blurb` text,
	`sort_order` integer DEFAULT 99 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_club_categories_slug_idx` ON `mp_club_categories` (`slug`);--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `category_id` integer REFERENCES mp_club_categories(id);--> statement-breakpoint
INSERT INTO `mp_club_categories` (`id`,`slug`,`label`,`sort_order`) VALUES
	(1,'tech','Tech & Engineering',10),
	(2,'business','Business & Strategy',20),
	(3,'creative','Creative & Design',30),
	(4,'cultural','Cultural & Performing',40),
	(5,'impact','Impact & Service',50),
	(6,'academic','Academic & Research',60);--> statement-breakpoint
UPDATE `mp_clubs` SET `category_id` = 1 WHERE `category_id` IS NULL AND `tags` LIKE '%"Tech"%';--> statement-breakpoint
UPDATE `mp_clubs` SET `category_id` = 2 WHERE `category_id` IS NULL AND `tags` LIKE '%"Business"%';--> statement-breakpoint
UPDATE `mp_clubs` SET `category_id` = 3 WHERE `category_id` IS NULL AND `tags` LIKE '%"Creative"%';--> statement-breakpoint
UPDATE `mp_clubs` SET `category_id` = 4 WHERE `category_id` IS NULL AND `tags` LIKE '%"Cultural"%';--> statement-breakpoint
UPDATE `mp_clubs` SET `category_id` = 5 WHERE `category_id` IS NULL AND `tags` LIKE '%"Impact"%';--> statement-breakpoint
UPDATE `mp_clubs` SET `category_id` = 6 WHERE `category_id` IS NULL AND `tags` LIKE '%"Academic"%';