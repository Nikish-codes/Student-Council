import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

export const Faqs: CollectionConfig = {
  slug: "faqs",
  labels: { singular: "FAQ", plural: "FAQs" },
  defaultSort: "order",
  admin: {
    useAsTitle: "question",
    defaultColumns: ["question", "page", "order"],
    group: "📅 Editorial",
    description: "Frequently-asked questions shown on /council and /support.",
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: () => true,
    create: isSignedIn,
    update: isSignedIn,
    delete: isAdminOrAbove,
  },
  versions: { maxPerDoc: 10 },
  fields: [
    {
      name: "question",
      type: "text",
      required: true,
      maxLength: 200,
    },
    {
      name: "answer",
      type: "richText",
      required: true,
      admin: { description: "Supports rich formatting and links." },
    },
    {
      name: "page",
      type: "select",
      required: true,
      defaultValue: "council",
      admin: { description: "Which page this FAQ appears on." },
      options: [
        { label: "Council", value: "council" },
        { label: "Support", value: "support" },
        { label: "Clubs", value: "clubs" },
        { label: "Events", value: "events" },
      ],
    },
    {
      name: "order",
      type: "number",
      required: true,
      defaultValue: 99,
      min: 0,
      admin: { description: "Lower = earlier." },
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/council", "/support", "/clubs", "/events"])],
    afterDelete: [revalidateAfterChange(["/council", "/support", "/clubs", "/events"])],
  },
};
