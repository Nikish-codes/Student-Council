CREATE TABLE `mp_sports_leagues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sport` text NOT NULL,
	`year` integer NOT NULL,
	`division` text DEFAULT 'open' NOT NULL,
	`venue` text,
	`start_date` text,
	`end_date` text,
	`banner_id` integer,
	`excerpt` text DEFAULT '',
	`description` text DEFAULT '',
	`standings` text DEFAULT '[]',
	`featured` integer DEFAULT false NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`banner_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_sports_leagues_slug_idx` ON `mp_sports_leagues` (`slug`);--> statement-breakpoint
CREATE INDEX `mp_sports_leagues_year_idx` ON `mp_sports_leagues` (`year`);--> statement-breakpoint
CREATE INDEX `mp_sports_leagues_sport_idx` ON `mp_sports_leagues` (`sport`);--> statement-breakpoint
CREATE INDEX `mp_sports_leagues_status_idx` ON `mp_sports_leagues` (`status`);--> statement-breakpoint
CREATE TABLE `mp_sports_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer,
	`league_id` integer,
	`sport` text NOT NULL,
	`round` text,
	`team_a_id` integer,
	`team_b_id` integer,
	`match_date` text,
	`venue` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`score_a` integer,
	`score_b` integer,
	`events` text DEFAULT '[]',
	`post_match` text DEFAULT '{}',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `mp_sports_tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`league_id`) REFERENCES `mp_sports_leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_a_id`) REFERENCES `mp_sports_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_b_id`) REFERENCES `mp_sports_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mp_sports_matches_tournament_idx` ON `mp_sports_matches` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `mp_sports_matches_league_idx` ON `mp_sports_matches` (`league_id`);--> statement-breakpoint
CREATE INDEX `mp_sports_matches_date_idx` ON `mp_sports_matches` (`match_date`);--> statement-breakpoint
CREATE INDEX `mp_sports_matches_status_idx` ON `mp_sports_matches` (`status`);--> statement-breakpoint
CREATE TABLE `mp_sports_page_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`academy_logo_id` integer,
	`tagline` text DEFAULT '',
	`gallery_image_ids` text DEFAULT '[]',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`academy_logo_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mp_sports_people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`photo_id` integer,
	`role` text DEFAULT 'representative' NOT NULL,
	`bio` text,
	`graduation_year` integer,
	`sport` text,
	`email` text,
	`phone` text,
	`sort_order` integer DEFAULT 99 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_sports_people_slug_idx` ON `mp_sports_people` (`slug`);--> statement-breakpoint
CREATE INDEX `mp_sports_people_role_idx` ON `mp_sports_people` (`role`);--> statement-breakpoint
CREATE TABLE `mp_sports_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_id` integer,
	`club_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`logo_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `mp_clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_sports_teams_slug_idx` ON `mp_sports_teams` (`slug`);--> statement-breakpoint
CREATE INDEX `mp_sports_teams_club_idx` ON `mp_sports_teams` (`club_id`);--> statement-breakpoint
CREATE TABLE `mp_sports_tournaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sport` text NOT NULL,
	`year` integer NOT NULL,
	`division` text DEFAULT 'open' NOT NULL,
	`venue` text,
	`start_date` text,
	`end_date` text,
	`banner_id` integer,
	`excerpt` text DEFAULT '',
	`description` text DEFAULT '',
	`featured` integer DEFAULT false NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`banner_id`) REFERENCES `mp_media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_sports_tournaments_slug_idx` ON `mp_sports_tournaments` (`slug`);--> statement-breakpoint
CREATE INDEX `mp_sports_tournaments_year_idx` ON `mp_sports_tournaments` (`year`);--> statement-breakpoint
CREATE INDEX `mp_sports_tournaments_sport_idx` ON `mp_sports_tournaments` (`sport`);--> statement-breakpoint
CREATE INDEX `mp_sports_tournaments_status_idx` ON `mp_sports_tournaments` (`status`);