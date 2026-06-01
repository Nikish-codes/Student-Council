import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

/**
 * Curated subset of Lucide icons we actually use on /support.
 * Editors pick from this list — typos can no longer break the icon.
 */
const SUPPORT_ICONS = [
  "ShieldAlert",
  "MessagesSquare",
  "Users",
  "HeartHandshake",
  "LifeBuoy",
  "Mail",
  "Phone",
  "BookOpen",
  "Megaphone",
  "GraduationCap",
  "Compass",
  "FileText",
  "Lock",
  "AlertCircle",
  "HelpCircle",
  "Headphones",
  "Stethoscope",
  "Heart",
  "Brain",
  "Calendar",
] as const;

export const SupportChannels: CollectionConfig = {
  slug: "support-channels",
  labels: { singular: "Support channel", plural: "Support channels" },
  defaultSort: "name",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "purpose", "ownedBy", "icon"],
    group: "❓ Help & FAQs",
    description:
      "💡 The support channels shown on /support. Each one renders as a card with an icon, owner, and short description. Use these to help students find the right person for things like grievances, mental health support, academic queries, etc.",
  },
  access: {
    read: () => true,
    create: isAdminOrAbove,
    update: isSignedIn,
    delete: isAdminOrAbove,
  },
  fields: [
    { name: "name", type: "text", required: true, maxLength: 60 },
    {
      name: "purpose",
      type: "text",
      required: true,
      maxLength: 80,
      admin: { description: "One-line headline shown under the title." },
    },
    {
      name: "description",
      type: "textarea",
      required: true,
      maxLength: 400,
      admin: { description: "Two- or three-sentence explanation." },
    },
    {
      name: "icon",
      type: "select",
      required: true,
      defaultValue: "LifeBuoy",
      options: SUPPORT_ICONS.map((i) => ({ label: i, value: i })),
      admin: { description: "Pick the Lucide icon used on the card." },
    },
    {
      name: "ownedBy",
      type: "text",
      required: true,
      maxLength: 80,
      admin: { description: "Which department/team owns this channel." },
    },
    {
      name: "bring",
      type: "text",
      hasMany: true,
      admin: {
        description:
          "Bullet list of what to bring / prepare before reaching out.",
      },
    },
    {
      name: "councilRole",
      type: "textarea",
      required: true,
      maxLength: 400,
      admin: { description: "What the Council does in this channel." },
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/support"])],
    afterDelete: [revalidateAfterChange(["/support"])],
  },
};
