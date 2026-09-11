ALTER TABLE `mp_sports_leagues` ADD `result` text;--> statement-breakpoint
ALTER TABLE `mp_sports_matches` ADD `participant_type` text DEFAULT 'teams' NOT NULL;--> statement-breakpoint
ALTER TABLE `mp_sports_matches` ADD `participant_a_name` text;--> statement-breakpoint
ALTER TABLE `mp_sports_matches` ADD `participant_b_name` text;--> statement-breakpoint
ALTER TABLE `mp_sports_tournaments` ADD `result` text;