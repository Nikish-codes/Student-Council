CREATE TABLE `mp_event_clubs` (
	`event_id` integer NOT NULL,
	`club_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`event_id`, `club_id`),
	FOREIGN KEY (`event_id`) REFERENCES `mp_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`club_id`) REFERENCES `mp_clubs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mp_event_clubs_club_idx` ON `mp_event_clubs` (`club_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `mp_event_clubs` (`event_id`, `club_id`)
SELECT `id`, `club_id`
FROM `mp_events`
WHERE `club_id` IS NOT NULL;
