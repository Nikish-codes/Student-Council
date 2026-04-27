import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isPublishedOrEditor, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const Events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Event", plural: "Events" },
  defaultSort: "-date",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "date", "status", "featured"],
    group: "📅 Editorial",
    description:
      "Every event the Council runs or supports. Drafts are private until an admin marks them Published.",
    pagination: { defaultLimit: 25 },
    livePreview: {
      url: ({ data }) =>
        `${SITE}/events/${(data as { slug?: string })?.slug ?? ""}?draft=true`,
      breakpoints: [
        { name: "mobile", label: "Mobile", width: 375, height: 667 },
        { name: "tablet", label: "Tablet", width: 768, height: 1024 },
        { name: "desktop", label: "Desktop", width: 1440, height: 900 },
      ],
    },
    preview: (doc) =>
      `${SITE}/events/${(doc as { slug?: string })?.slug ?? ""}?draft=true`,
  },
  access: {
    read: isPublishedOrEditor,
    create: isSignedIn,
    update: isSignedIn,
    delete: isAdminOrAbove,
  },
  versions: {
    drafts: { autosave: { interval: 800 } },
    maxPerDoc: 30,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Overview",
          description: "What it is, when it happens, and where to find it.",
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
              maxLength: 80,
              admin: { description: "Up to 80 characters." },
            },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              index: true,
              admin: {
                description:
                  "URL slug — lowercase letters, numbers, dashes only. Becomes /events/<slug>.",
              },
            },
            {
              name: "status",
              type: "select",
              required: true,
              index: true,
              defaultValue: "draft",
              admin: {
                description:
                  "Drafts and pending reviews are not visible on the site. Only an admin can publish.",
              },
              options: [
                { label: "Draft", value: "draft" },
                { label: "Pending review", value: "pending_review" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" },
              ],
              access: {
                update: ({ req }) => {
                  const r = (req.user as { role?: string } | null)?.role;
                  return r === "super_admin" || r === "admin";
                },
              },
            },
            {
              name: "category",
              type: "select",
              required: true,
              index: true,
              options: [
                { label: "Tech", value: "tech" },
                { label: "Cultural", value: "cultural" },
                { label: "Sports", value: "sports" },
                { label: "Flagship", value: "flagship" },
                { label: "Academic", value: "academic" },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "date",
                  type: "date",
                  required: true,
                  index: true,
                  admin: {
                    width: "50%",
                    description: "Start date & time.",
                    date: { pickerAppearance: "dayAndTime" },
                  },
                },
                {
                  name: "endDate",
                  type: "date",
                  index: true,
                  admin: {
                    width: "50%",
                    description: "Optional. Used for multi-day events.",
                    date: { pickerAppearance: "dayAndTime" },
                  },
                },
              ],
            },
            {
              name: "venue",
              type: "text",
              required: true,
              maxLength: 120,
              admin: { description: "Where it happens. Up to 120 characters." },
            },
          ],
        },
        {
          label: "Story",
          description: "The pitch that goes on cards, plus the full description.",
          fields: [
            {
              name: "excerpt",
              type: "textarea",
              required: true,
              maxLength: 240,
              admin: {
                description:
                  "One- or two-sentence pitch shown on listings (max 240 chars).",
              },
            },
            {
              name: "description",
              type: "richText",
              admin: { description: "Full event description shown on the detail page." },
            },
          ],
        },
        {
          label: "Media",
          description: "The visual identity for this event.",
          fields: [
            {
              name: "banner",
              type: "upload",
              relationTo: "media",
              required: true,
              admin: { description: "Hero/banner image. 16:9 preferred, at least 1600×900." },
            },
            {
              name: "videoUrl",
              type: "text",
              admin: {
                description:
                  "Optional Cloudinary/direct video file, YouTube, or Vimeo URL shown on the event page and featured event surfaces.",
              },
              validate: (val: unknown) => {
                if (!val) return true;
                if (typeof val !== "string") return "Must be a URL.";
                try {
                  const u = new URL(val);
                  if (!/^https?:$/.test(u.protocol)) return "Must be http or https.";
                  return true;
                } catch {
                  return "Enter a full URL like https://youtube.com/...";
                }
              },
            },
          ],
        },
        {
          label: "Engagement",
          description: "Registration, attendance, and ownership.",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "registrationUrl",
                  type: "text",
                  admin: {
                    width: "50%",
                    description: "Optional. External RSVP/sign-up link.",
                  },
                  validate: (val: unknown) => {
                    if (!val) return true;
                    if (typeof val !== "string") return "Must be a URL.";
                    try {
                      const u = new URL(val);
                      if (!/^https?:$/.test(u.protocol)) return "Must be http or https.";
                      return true;
                    } catch {
                      return "Enter a full URL like https://...";
                    }
                  },
                },
                {
                  name: "attendees",
                  type: "number",
                  min: 0,
                  admin: {
                    width: "50%",
                    description: "Optional. Final headcount for past events.",
                  },
                },
              ],
            },
            {
              name: "featured",
              type: "checkbox",
              index: true,
              defaultValue: false,
              admin: {
                description:
                  "Featured events are highlighted on listing pages and may appear on the homepage.",
              },
            },
            {
              name: "organizer",
              type: "relationship",
              relationTo: "users",
              admin: { description: "Person responsible (auto-set on create)." },
            },
            {
              name: "club",
              type: "relationship",
              relationTo: "clubs",
              admin: { description: "Optional hosting club." },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === "create" && req.user && !data.organizer) {
          data.organizer = req.user.id;
        }
        return data;
      },
    ],
    afterChange: [revalidateAfterChange(["/", "/events", "/archive"])],
    afterDelete: [revalidateAfterChange(["/", "/events", "/archive"])],
  },
};
