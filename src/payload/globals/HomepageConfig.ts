import type { GlobalConfig } from "payload";
import { isAdminOrAbove } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * The homepage is configured here. Every visible word and every
 * featured item on `/` flows through this global.
 */
export const HomepageConfig: GlobalConfig = {
  slug: "homepage-config",
  label: "Homepage",
  admin: {
    group: "🏠 Homepage",
    description:
      "💡 Everything visible on the homepage — hero copy, manifesto, stats, quick actions, the closing CTA, and the rotating Vault. Use the tabs at the top to jump between sections. Changes save automatically every ~1 second; the homepage rebuilds itself within a few seconds of you saving.",
    livePreview: {
      url: () => `${SITE}/`,
      breakpoints: [
        { name: "mobile", label: "Mobile", width: 375, height: 667 },
        { name: "desktop", label: "Desktop", width: 1440, height: 900 },
      ],
    },
    preview: () => `${SITE}/`,
  },
  access: {
    read: () => true,
    update: isAdminOrAbove,
  },
  versions: { drafts: { autosave: { interval: 800 } }, max: 20 },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ─────────── Hero ───────────
        {
          label: "Hero",
          description: "The first thing visitors see.",
          fields: [
            {
              name: "hero",
              type: "group",
              admin: { description: "Top of the homepage." },
              fields: [
                {
                  name: "kicker",
                  type: "text",
                  maxLength: 80,
                  defaultValue: "Woxsen Student Council · Session 2026/27",
                  admin: {
                    description: "Tiny eyebrow line above the headline.",
                  },
                },
                {
                  name: "headline",
                  type: "text",
                  maxLength: 30,
                  defaultValue: "Empowering",
                  admin: { description: "Single big word on line 1." },
                },
                {
                  name: "sublineLead",
                  type: "text",
                  maxLength: 30,
                  defaultValue: "student",
                  admin: {
                    description: "First word on line 2 (e.g. 'student').",
                  },
                },
                {
                  name: "sublineWords",
                  type: "array",
                  minRows: 1,
                  maxRows: 8,
                  admin: {
                    description:
                      "Words that cycle in the hero (e.g. voices, futures, ideas). Cycle every ~3s.",
                  },
                  defaultValue: [
                    { word: "voices." },
                    { word: "futures." },
                    { word: "ideas." },
                    { word: "stories." },
                  ],
                  fields: [
                    {
                      name: "word",
                      type: "text",
                      required: true,
                      maxLength: 24,
                    },
                  ],
                },
                {
                  name: "subParagraph",
                  type: "textarea",
                  maxLength: 240,
                  defaultValue:
                    "The official portal of the Woxsen Student Council — events, clubs, leadership, and the support channels that keep campus moving.",
                  admin: { description: "Sub-paragraph under the headline." },
                },
                {
                  name: "ctas",
                  type: "array",
                  minRows: 1,
                  maxRows: 4,
                  admin: {
                    description: "Call-to-action buttons under the hero copy.",
                  },
                  defaultValue: [
                    {
                      label: "Explore events",
                      href: "/events",
                      variant: "primary",
                    },
                    {
                      label: "Raise a concern",
                      href: "/support#grievance-form",
                      variant: "outline",
                    },
                    {
                      label: "Meet the team",
                      href: "/council",
                      variant: "ghost",
                    },
                  ],
                  fields: [
                    {
                      name: "label",
                      type: "text",
                      required: true,
                      maxLength: 40,
                    },
                    {
                      name: "href",
                      type: "text",
                      required: true,
                      maxLength: 200,
                    },
                    {
                      name: "variant",
                      type: "select",
                      defaultValue: "primary",
                      options: [
                        { label: "Primary (filled)", value: "primary" },
                        { label: "Outline", value: "outline" },
                        { label: "Ghost", value: "ghost" },
                      ],
                    },
                  ],
                },
                {
                  name: "marqueeText",
                  type: "text",
                  maxLength: 200,
                  defaultValue:
                    "Of the students. For the students. By the students.",
                  admin: {
                    description:
                      "Faint italic phrase that drifts behind the hero. Repeated infinitely.",
                  },
                },
              ],
            },
          ],
        },

        // ─────────── Stats ───────────
        {
          label: "Stats",
          description: "The big numbers between Vault and Manifesto.",
          fields: [
            {
              name: "statsKicker",
              type: "text",
              maxLength: 80,
              defaultValue: "By the numbers · 2026/27",
            },
            {
              name: "stats",
              type: "array",
              minRows: 0,
              maxRows: 8,
              admin: {
                description:
                  "Each stat counts up on scroll. Use 'displayValue' to override (e.g. show '5K+' instead of counting to 5000).",
              },
              defaultValue: [
                { value: 29, label: "Student-run clubs" },
                { value: 8, label: "Schools represented" },
                { value: 200, suffix: "+", label: "Events every year" },
                {
                  value: 5000,
                  suffix: "+",
                  label: "Active students",
                  displayValue: "5K+",
                },
                { value: 1, label: "Council, of you" },
              ],
              fields: [
                { name: "value", type: "number", required: true, min: 0 },
                { name: "suffix", type: "text", maxLength: 4 },
                {
                  name: "displayValue",
                  type: "text",
                  maxLength: 12,
                  admin: {
                    description:
                      "Optional. Overrides the count-up (e.g. '5K+').",
                  },
                },
                { name: "label", type: "text", required: true, maxLength: 40 },
              ],
            },
          ],
        },

        // ─────────── Manifesto ───────────
        {
          label: "Manifesto",
          description: "Big kinetic statements scrolled through.",
          fields: [
            {
              name: "manifestoKicker",
              type: "text",
              maxLength: 80,
              defaultValue: "Manifesto · 2026/27",
            },
            {
              name: "manifestoLines",
              type: "array",
              minRows: 1,
              maxRows: 8,
              admin: {
                description:
                  "Each line has a 'lead' (white) and a 'tail' (italic muted). Reveals on scroll.",
              },
              defaultValue: [
                { lead: "We don't run", tail: "the desks." },
                { lead: "We open", tail: "the doors." },
                { lead: "Built by students.", tail: "Owned by students." },
                { lead: "If it matters here,", tail: "it starts here." },
              ],
              fields: [
                { name: "lead", type: "text", required: true, maxLength: 60 },
                { name: "tail", type: "text", required: true, maxLength: 60 },
              ],
            },
            {
              name: "manifestoFooter",
              type: "text",
              maxLength: 80,
              defaultValue: "Read in: 9 seconds",
            },
          ],
        },

        // ─────────── Quick actions ───────────
        {
          label: "Quick actions",
          description: "The 3 CTA cards (Grievance / Join / Talk to Council).",
          fields: [
            {
              name: "quickActions",
              type: "array",
              minRows: 0,
              maxRows: 6,
              defaultValue: [
                {
                  icon: "ShieldAlert",
                  title: "Submit a grievance",
                  body: "Confidential channel for harassment, discrimination, or misconduct concerns.",
                  href: "/support#grievance-form",
                },
                {
                  icon: "Users",
                  title: "Join a club",
                  body: "Twelve+ active clubs across tech, design, arts, sports and entrepreneurship.",
                  href: "/clubs",
                },
                {
                  icon: "MessagesSquare",
                  title: "Talk to the Council",
                  body: "Share an idea, request a meeting, or flag something the Council should know.",
                  href: "mailto:council@woxsen.edu.in",
                },
              ],
              fields: [
                {
                  name: "icon",
                  type: "select",
                  required: true,
                  defaultValue: "ShieldAlert",
                  options: [
                    "ShieldAlert",
                    "Users",
                    "MessagesSquare",
                    "HeartHandshake",
                    "LifeBuoy",
                    "Mail",
                    "Megaphone",
                    "BookOpen",
                    "Calendar",
                    "Sparkles",
                  ].map((i) => ({ label: i, value: i })),
                },
                { name: "title", type: "text", required: true, maxLength: 60 },
                {
                  name: "body",
                  type: "textarea",
                  required: true,
                  maxLength: 220,
                },
                { name: "href", type: "text", required: true, maxLength: 200 },
              ],
            },
          ],
        },

        // ─────────── Closing CTA ───────────
        {
          label: "Closing CTA",
          description: "The final block before the footer.",
          fields: [
            {
              name: "closingCta",
              type: "group",
              fields: [
                {
                  name: "kicker",
                  type: "text",
                  maxLength: 60,
                  defaultValue: "Get involved",
                },
                {
                  name: "headlineLead",
                  type: "text",
                  maxLength: 60,
                  defaultValue: "The Council is yours.",
                },
                {
                  name: "headlineTail",
                  type: "text",
                  maxLength: 60,
                  defaultValue: "Show up. Speak up.",
                  admin: {
                    description: "Italic muted continuation on the next line.",
                  },
                },
                {
                  name: "ctas",
                  type: "array",
                  minRows: 1,
                  maxRows: 3,
                  defaultValue: [
                    {
                      label: "Meet the Council",
                      href: "/council",
                      variant: "primary",
                    },
                    {
                      label: "Browse clubs",
                      href: "/clubs",
                      variant: "outline",
                    },
                  ],
                  fields: [
                    {
                      name: "label",
                      type: "text",
                      required: true,
                      maxLength: 40,
                    },
                    {
                      name: "href",
                      type: "text",
                      required: true,
                      maxLength: 200,
                    },
                    {
                      name: "variant",
                      type: "select",
                      defaultValue: "primary",
                      options: [
                        { label: "Primary (filled)", value: "primary" },
                        { label: "Outline", value: "outline" },
                        { label: "Ghost", value: "ghost" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ─────────── Featured ───────────
        {
          label: "Featured",
          description:
            "Pinned content on the homepage. Use these to override the auto-pulled lists.",
          fields: [
            {
              name: "flagshipEvent",
              type: "relationship",
              relationTo: "events",
              admin: { description: "Optional. Featured event hero." },
            },
            {
              name: "featuredClubs",
              type: "relationship",
              relationTo: "clubs",
              hasMany: true,
              maxRows: 12,
              admin: {
                description:
                  "Pin specific clubs to the logo wall. Leave empty to auto-show all clubs.",
              },
            },
            {
              name: "vaultStories",
              type: "relationship",
              relationTo: "recaps",
              hasMany: true,
              maxRows: 8,
              admin: {
                description:
                  "Recaps shown in the rotating Home Vault. Leave empty to use the most recent recaps.",
              },
            },
            {
              name: "tagline",
              type: "text",
              maxLength: 120,
              defaultValue: "Built by students. For students.",
              admin: { description: "Site-wide tagline used in metadata." },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/"])],
  },
};
