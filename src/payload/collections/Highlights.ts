import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

export const Highlights: CollectionConfig = {
  slug: "highlights",
  labels: { singular: "Highlight", plural: "Highlights" },
  defaultSort: "order",
  admin: {
    useAsTitle: "alt",
    defaultColumns: ["image", "alt", "span", "order", "caption"],
    group: "📅 Editorial",
    description:
      "Photos shown in the campus mosaic. 'span' controls how big each tile is.",
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
      name: "image",
      type: "upload",
      relationTo: "media",
      required: true,
      admin: { description: "Min 1200px on the long side." },
    },
    {
      name: "alt",
      type: "text",
      required: true,
      maxLength: 140,
      admin: { description: "Required for accessibility — describe the photo." },
    },
    {
      name: "caption",
      type: "text",
      maxLength: 140,
      admin: { description: "Optional caption shown on hover." },
    },
    {
      name: "span",
      type: "select",
      defaultValue: "md",
      admin: {
        description:
          "Tile size in the mosaic. Mix sizes for a varied layout.",
      },
      options: [
        { label: "Small (1×1)", value: "sm" },
        { label: "Medium (2×1)", value: "md" },
        { label: "Large (2×2)", value: "lg" },
        { label: "Extra large (3×2)", value: "xl" },
      ],
    },
    {
      name: "order",
      type: "number",
      required: true,
      defaultValue: 99,
      admin: { description: "Display order. Lower = earlier." },
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/"])],
    afterDelete: [revalidateAfterChange(["/"])],
  },
};
