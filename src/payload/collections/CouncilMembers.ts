import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const CouncilMembers: CollectionConfig = {
  slug: "council-members",
  labels: { singular: "Council member", plural: "Council members" },
  defaultSort: "order",
  admin: {
    useAsTitle: "name",
    defaultColumns: [
      "name",
      "role",
      "program",
      "order",
      "isPresident",
      "featured",
    ],
    group: "👥 People & clubs",
    description:
      "💡 The Council members shown on /council. Use 'order' to control the layout — lower numbers appear first, so set the President to 1, VPs to 2/3, and so on. Tick exactly one member as 'isPresident'; that's the person whose long-form message appears on the President hero.",
    pagination: { defaultLimit: 50 },
    livePreview: {
      url: () => `${SITE}/council`,
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
      maxLength: 80,
    },
    {
      name: "role",
      type: "text",
      required: true,
      maxLength: 60,
      admin: {
        description:
          "e.g. 'President', 'Vice President — Cultural', 'Secretary'.",
      },
    },
    {
      name: "program",
      type: "text",
      required: true,
      maxLength: 80,
      admin: { description: "School / programme / batch year." },
    },
    {
      name: "photo",
      type: "upload",
      relationTo: "media",
      required: true,
      admin: { description: "Portrait. 1:1 ratio, min 800×800." },
    },
    {
      name: "email",
      type: "email",
      admin: { description: "Optional public contact email." },
    },
    {
      name: "linkedin",
      type: "text",
      admin: { description: "Optional LinkedIn profile URL." },
      validate: (val: unknown) => {
        if (!val) return true;
        if (typeof val !== "string") return "Must be a URL.";
        try {
          const u = new URL(val);
          if (!/^https?:$/.test(u.protocol)) return "Must be http or https.";
          if (!/linkedin\.com/i.test(u.hostname))
            return "Should be a linkedin.com URL.";
          return true;
        } catch {
          return "Enter a full URL like https://www.linkedin.com/in/...";
        }
      },
    },
    {
      name: "message",
      type: "textarea",
      maxLength: 1200,
      admin: {
        description: "Long-form message — used on the President hero only.",
      },
    },
    {
      name: "quote",
      type: "textarea",
      maxLength: 240,
      admin: {
        description: "Short one-line statement for the editorial slab.",
      },
    },
    {
      name: "isPresident",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Tick exactly one member to mark them as President. Used by the homepage and /council hero.",
      },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Highlighted in the council grid." },
    },
    {
      name: "order",
      type: "number",
      required: true,
      defaultValue: 99,
      min: 0,
      admin: {
        description:
          "Display order on /council. Lower numbers appear first. Use 1 for the President.",
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // Enforce a single president — if this doc is being saved as president,
        // un-tick it on every other doc.
        if (data.isPresident) {
          await req.payload.update({
            collection: "council-members",
            where: {
              and: [
                { isPresident: { equals: true } },
                ...(operation === "update" && originalDoc?.id
                  ? [{ id: { not_equals: originalDoc.id } }]
                  : []),
              ],
            },
            data: { isPresident: false },
            overrideAccess: true,
          });
        }
        return data;
      },
    ],
    afterChange: [revalidateAfterChange(["/", "/council"])],
    afterDelete: [revalidateAfterChange(["/", "/council"])],
  },
};
