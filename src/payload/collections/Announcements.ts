import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

export const Announcements: CollectionConfig = {
  slug: "announcements",
  labels: { singular: "Announcement", plural: "Announcements" },
  defaultSort: "-date",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "pinned"],
    group: "📢 Announcements",
    description:
      "💡 Short, dated headlines that scroll in the ticker right under the homepage hero. Pinned items always appear first. Keep them under ~140 characters. For new announcements, the 'Post an announcement' wizard on the dashboard is fastest — come here to edit, pin, or remove existing ones.",
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: () => true,
    create: isSignedIn,
    update: isSignedIn,
    delete: isAdminOrAbove,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      maxLength: 140,
      admin: { description: "The headline that scrolls. Max 140 characters." },
    },
    {
      name: "href",
      type: "text",
      admin: { description: "Optional click-through URL." },
      validate: (val: unknown) => {
        if (!val) return true;
        if (typeof val !== "string") return "Must be a URL or path.";
        if (val.startsWith("/")) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return "Must be a full URL or a path starting with /";
        }
      },
    },
    {
      name: "date",
      type: "date",
      required: true,
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: { description: "Used for sorting. Newer = appears first." },
    },
    {
      name: "pinned",
      type: "checkbox",
      index: true,
      defaultValue: false,
      admin: { description: "Pinned announcements always appear first." },
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/"])],
    afterDelete: [revalidateAfterChange(["/"])],
  },
};
