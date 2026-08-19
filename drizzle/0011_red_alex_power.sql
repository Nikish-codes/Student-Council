ALTER TABLE `mp_users` ADD `must_change_password` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `page_template` text;
--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `page_theme` text;
--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `page_visible_sections` text;
--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `page_section_headings` text;
--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `page_typography` text;
--> statement-breakpoint
ALTER TABLE `mp_clubs` ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `mp_events` ADD `version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `mp_recaps` ADD `version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `mp_audit_log` ADD `club_id` integer REFERENCES mp_clubs(id);
--> statement-breakpoint
ALTER TABLE `mp_audit_log` ADD `revision_id` text;
--> statement-breakpoint
CREATE TABLE `mp_club_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`club_id` integer NOT NULL,
	`membership_role` text DEFAULT 'member' NOT NULL,
	`can_edit_page` integer DEFAULT false NOT NULL,
	`can_manage_events` integer DEFAULT false NOT NULL,
	`can_manage_media` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`invited_by_user_id` integer,
	`revoked_by_user_id` integer,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `mp_users`(`id`),
	FOREIGN KEY (`club_id`) REFERENCES `mp_clubs`(`id`),
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `mp_users`(`id`),
	FOREIGN KEY (`revoked_by_user_id`) REFERENCES `mp_users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_club_memberships_user_club_idx` ON `mp_club_memberships` (`user_id`,`club_id`);
--> statement-breakpoint
CREATE INDEX `mp_club_memberships_club_idx` ON `mp_club_memberships` (`club_id`);
--> statement-breakpoint
CREATE INDEX `mp_club_memberships_user_idx` ON `mp_club_memberships` (`user_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `mp_club_memberships` (
	`id`, `user_id`, `club_id`, `membership_role`, `can_edit_page`,
	`can_manage_events`, `can_manage_media`, `is_active`
)
SELECT
	lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
	substr(hex(randomblob(2)), 2) || '-' ||
	substr('89ab', abs(random()) % 4 + 1, 1) ||
	substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
	u.`id`, c.`id`, 'president', true, true, true, true
FROM `mp_users` u
JOIN `mp_clubs` c ON c.`id` = u.`club_id` OR c.`lead_id` = u.`id`
WHERE u.`role` = 'club_lead';
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_club_memberships_one_president_idx`
ON `mp_club_memberships` (`club_id`)
WHERE `membership_role` = 'president' AND `is_active` = true;
--> statement-breakpoint
CREATE TABLE `mp_content_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`club_id` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`snapshot` text NOT NULL,
	`base_version` integer NOT NULL,
	`author_user_id` integer NOT NULL,
	`submitted_at` text,
	`reviewed_by_user_id` integer,
	`reviewed_at` text,
	`review_note` text,
	`supersedes_revision_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`club_id`) REFERENCES `mp_clubs`(`id`),
	FOREIGN KEY (`author_user_id`) REFERENCES `mp_users`(`id`),
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `mp_users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `mp_content_revisions_entity_idx` ON `mp_content_revisions` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE INDEX `mp_content_revisions_club_idx` ON `mp_content_revisions` (`club_id`);
--> statement-breakpoint
CREATE INDEX `mp_content_revisions_status_idx` ON `mp_content_revisions` (`status`);
--> statement-breakpoint
CREATE INDEX `mp_content_revisions_submitted_idx` ON `mp_content_revisions` (`submitted_at`);
--> statement-breakpoint
CREATE TABLE `mp_event_followup_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` integer NOT NULL,
	`club_id` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `mp_events`(`id`),
	FOREIGN KEY (`club_id`) REFERENCES `mp_clubs`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mp_event_followup_tasks_event_idx` ON `mp_event_followup_tasks` (`event_id`);
--> statement-breakpoint
CREATE INDEX `mp_event_followup_tasks_club_status_idx` ON `mp_event_followup_tasks` (`club_id`,`status`);
