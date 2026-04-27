import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const Clubs: CollectionConfig = {
  slug: "clubs",
  labels: { singular: "Club", plural: "Clubs" },
  defaultSort: "name",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "tags", "members", "lead"],
    group: "👥 People",
    description: "Every club, society, and student-run group.",
    pagination: { defaultLimit: 50 },
    livePreview: {
      url: () => `${SITE}/clubs`,
      breakpoints: [
        { name: "mobile", label: "Mobile", width: 375, height: 667 },
        { name: "desktop", label: "Desktop", width: 1440, height: 900 },
      ],
    },
  },
  access: {
    read: () => true,
    create: isAdminOrAbove,
    update: isSignedIn,
    delete: isAdminOrAbove,
  },
  versions: { maxPerDoc: 10 },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      maxLength: 60,
      admin: { description: "Display name. Up to 60 characters." },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { description: "URL slug. Used for /clubs/<slug>." },
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      required: true,
      admin: {
        description:
          "Square logo with transparent background preferred. Min 512×512.",
      },
    },
    {
      name: "blurb",
      type: "textarea",
      required: true,
      maxLength: 200,
      admin: { description: "One-paragraph pitch (max 200 chars)." },
    },
    {
      name: "joinUrl",
      type: "text",
      admin: { description: "Optional. Link to the join form / WhatsApp / Instagram." },
      validate: (val: unknown) => {
        if (!val) return true;
        if (typeof val !== "string") return "Must be a URL.";
        try {
          const u = new URL(val);
          if (!/^https?:|^mailto:/.test(u.protocol)) return "Must be http, https, or mailto.";
          return true;
        } catch {
          return "Enter a full URL like https://...";
        }
      },
    },
    {
      name: "tags",
      type: "text",
      hasMany: true,
      admin: { description: "Free-form tags used for filtering on /clubs." },
    },
    {
      name: "members",
      type: "number",
      min: 0,
      admin: { description: "Approximate active member count." },
    },
    {
      name: "lead",
      type: "relationship",
      relationTo: "users",
      admin: { description: "The club_lead user who manages this club." },
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/", "/clubs"])],
    afterDelete: [revalidateAfterChange(["/", "/clubs"])],
  },
};
