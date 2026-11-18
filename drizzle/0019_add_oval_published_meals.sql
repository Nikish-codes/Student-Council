ALTER TABLE `mp_oval_menu_days` ADD `published_meals` text;--> statement-breakpoint
UPDATE `mp_oval_menu_days` SET `published_meals` = `meals` WHERE `status` = 'approved' AND `published_meals` IS NULL;
