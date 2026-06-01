/**
 * The catalog of "things you might want to do" shown on the admin landing
 * page. Each task is a card. Cards either deep-link into a standard Payload
 * screen (`href`) or open one of our guided wizards.
 *
 * Keep this list short and *task-oriented*. The schema-oriented sidebar still
 * exists for power users — this is the front door for everyone else.
 */

export type TaskGroup = {
  id: string;
  title: string;
  blurb: string;
  tasks: Task[];
};

export type Task = {
  id: string;
  /** Short verb phrase. Should read like a sentence beginning. */
  label: string;
  /** One-line plain-English description of what this does. */
  blurb: string;
  /** Lucide icon name (rendered server-side). */
  icon: TaskIcon;
  /** Where the card sends you. Absolute path inside /admin. */
  href: string;
  /** If true, renders the card with a stronger highlight. */
  primary?: boolean;
  /** Optional badge text (e.g. "Wizard", "Quick"). */
  badge?: string;
};

export type TaskIcon =
  | "home"
  | "calendar-plus"
  | "calendar"
  | "megaphone"
  | "film"
  | "image"
  | "users"
  | "user-plus"
  | "settings"
  | "help-circle"
  | "life-buoy"
  | "folder"
  | "sparkles"
  | "pin";

export const TASK_GROUPS: TaskGroup[] = [
  {
    id: "homepage",
    title: "Homepage",
    blurb:
      "Edit what visitors see when they land on the site. Hero, manifesto, featured event, vault stories, stats.",
    tasks: [
      {
        id: "edit-homepage",
        label: "Edit the homepage",
        blurb:
          "Hero copy, cycling words, manifesto, stats, quick actions, closing CTA — all in one place with live preview.",
        icon: "home",
        href: "/admin/globals/homepage-config",
        primary: true,
      },
      {
        id: "pin-featured-event",
        label: "Pin a featured event",
        blurb:
          "Choose which event takes over the homepage's flagship slot. Overrides the auto-pick.",
        icon: "pin",
        href: "/admin/globals/homepage-config",
      },
      {
        id: "change-vault",
        label: "Change the homepage videos",
        blurb:
          "Curate which recaps appear in the rotating Vault on the homepage.",
        icon: "film",
        href: "/admin/globals/homepage-config",
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    blurb:
      "Upcoming things, past things, and the cinematic recaps that live on after.",
    tasks: [
      {
        id: "new-event",
        label: "Add an event",
        blurb:
          "Guided 4-step form. Walks you through the basics, location, visuals, and publishing.",
        icon: "calendar-plus",
        href: "/admin/wizards/new-event",
        primary: true,
        badge: "Wizard",
      },
      {
        id: "browse-upcoming",
        label: "Edit an upcoming event",
        blurb:
          "Filter to events that haven't happened yet. Tweak details, swap cover images, add registration links.",
        icon: "calendar",
        href: "/admin/collections/events?limit=25&sort=date",
      },
      {
        id: "browse-past",
        label: "Edit a past event",
        blurb:
          "Find a past event to update its attendance, add photos, or attach a recap.",
        icon: "calendar",
        href: "/admin/collections/events?limit=25&sort=-date",
      },
      {
        id: "new-recap",
        label: "Add a recap to a past event",
        blurb:
          "Hero image, gallery, headline stats. Recaps power the rotating Vault on the homepage.",
        icon: "sparkles",
        href: "/admin/wizards/new-recap",
        badge: "Wizard",
      },
    ],
  },
  {
    id: "announcements",
    title: "Announcements",
    blurb:
      "The scrolling ticker on the homepage. Short, dated headlines — pin the important ones.",
    tasks: [
      {
        id: "new-announcement",
        label: "Post an announcement",
        blurb:
          "Headline, optional link, optional pin. Goes live the moment you save.",
        icon: "megaphone",
        href: "/admin/wizards/new-announcement",
        primary: true,
        badge: "Wizard",
      },
      {
        id: "manage-announcements",
        label: "Manage announcements",
        blurb: "Edit, unpin, or remove existing ticker items.",
        icon: "megaphone",
        href: "/admin/collections/announcements",
      },
    ],
  },
  {
    id: "people",
    title: "People & clubs",
    blurb: "The Council team and every student-run club on /clubs.",
    tasks: [
      {
        id: "new-council-member",
        label: "Add a council member",
        blurb:
          "Name, role, photo, and order. The lowest order number = president slot.",
        icon: "user-plus",
        href: "/admin/collections/council-members/create",
      },
      {
        id: "browse-council",
        label: "Edit the council team",
        blurb: "Reorder, update photos, change roles for the current session.",
        icon: "users",
        href: "/admin/collections/council-members",
      },
      {
        id: "browse-clubs",
        label: "Manage clubs",
        blurb: "Add a new club, update logos, change leads or member counts.",
        icon: "users",
        href: "/admin/collections/clubs",
      },
    ],
  },
  {
    id: "media-and-settings",
    title: "Media & settings",
    blurb:
      "Uploaded files, site-wide settings, support channels, and FAQs.",
    tasks: [
      {
        id: "media",
        label: "Open the media library",
        blurb:
          "Every image, video, and PDF on the site. Upload new files here first, then attach them when editing.",
        icon: "folder",
        href: "/admin/collections/media",
      },
      {
        id: "site-settings",
        label: "Edit site settings",
        blurb:
          "Brand name, contact email, socials, campus info, grievance form categories.",
        icon: "settings",
        href: "/admin/globals/site-settings",
      },
      {
        id: "support-channels",
        label: "Manage support channels",
        blurb:
          "The cards on /support. Each one has an icon, owner, and description.",
        icon: "life-buoy",
        href: "/admin/collections/support-channels",
      },
      {
        id: "faqs",
        label: "Manage FAQs",
        blurb: "Question/answer pairs shown on /council, /support, and more.",
        icon: "help-circle",
        href: "/admin/collections/faqs",
      },
      {
        id: "highlights",
        label: "Manage campus highlights",
        blurb: "The photo mosaic on the homepage.",
        icon: "image",
        href: "/admin/collections/highlights",
      },
    ],
  },
];
