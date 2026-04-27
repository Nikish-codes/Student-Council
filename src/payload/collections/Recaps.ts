import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const Recaps: CollectionConfig = {
  slug: "recaps",
  labels: { singular: "Recap", plural: "Recaps" },
  defaultSort: "-publishedAt",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "event", "publishedAt"],
    group: "📅 Editorial",
    description:
      "Cinematic post-event recaps. These power the rotating Vault on the homepage and the recap pages.",
    pagination: { defaultLimit: 25 },
    livePreview: {
      url: ({ data }) =>
        `${SITE}/events/${(data as { slug?: string })?.slug ?? ""}?recap=1`,
      breakpoints: [
        { name: "mobile", label: "Mobile", width: 375, height: 667 },
        { name: "desktop", label: "Desktop", width: 1440, height: 900 },
      ],
    },
  },
  access: {
    read: () => true,
    create: isSignedIn,
    update: isSignedIn,
    delete: isAdminOrAbove,
  },
  versions: {
    drafts: { autosave: { interval: 800 } },
    maxPerDoc: 20,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Overview",
          fields: [
            { name: "title", type: "text", required: true, maxLength: 100 },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              index: true,
              admin: {
                description:
                  "URL slug — lowercase, dashes only. Used for the recap page.",
              },
            },
            {
              name: "event",
              type: "relationship",
              relationTo: "events",
              required: true,
              admin: { description: "The event this recap covers." },
            },
            {
              name: "kicker",
              type: "text",
              maxLength: 60,
              admin: { description: "Tiny eyebrow line, e.g. 'FLAGSHIP · CULTURAL FEST'." },
            },
            {
              name: "blurb",
              type: "textarea",
              maxLength: 280,
              admin: { description: "One- or two-line summary used on cards." },
            },
            {
              name: "publishedAt",
              type: "date",
              index: true,
              defaultValue: () => new Date().toISOString(),
              admin: { description: "Used for sorting in the Vault." },
            },
          ],
        },
        {
          label: "Hero",
          description: "The big image or video at the top.",
          fields: [
            {
              name: "heroMedia",
              type: "upload",
              relationTo: "media",
              required: true,
              admin: {
                description:
                  "Required. Used as the still poster and as a fallback if no video URL.",
              },
            },
            {
              name: "heroVideoUrl",
              type: "text",
              admin: {
                description:
                  "Optional. Direct .mp4/.webm URL (R2/Cloudinary) used as a looping hero. YouTube/Vimeo not supported.",
              },
            },
          ],
        },
        {
          label: "Gallery",
          fields: [
            {
              name: "gallery",
              type: "array",
              admin: { description: "Photo gallery shown below the hero." },
              fields: [
                {
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                  required: true,
                },
                { name: "caption", type: "text", maxLength: 140 },
              ],
            },
          ],
        },
        {
          label: "Stats",
          fields: [
            {
              name: "stats",
              type: "array",
              admin: { description: "Headline numbers (attendance, hours, etc)." },
              fields: [
                { name: "label", type: "text", required: true, maxLength: 40 },
                { name: "value", type: "text", required: true, maxLength: 20 },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/", "/events", "/archive"])],
    afterDelete: [revalidateAfterChange(["/", "/events", "/archive"])],
  },
};
