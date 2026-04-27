import type { CollectionConfig } from "payload";
import { isAdminOrAbove, isSignedIn } from "../access.ts";

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "File", plural: "Media library" },
  admin: {
    useAsTitle: "filename",
    defaultColumns: ["filename", "alt", "mimeType", "filesize", "updatedAt"],
    group: "🗂️ Library",
    description:
      "Every uploaded image, video, and PDF. Stored on Cloudflare R2. Required: alt text on every image.",
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: () => true, // public assets
    create: isSignedIn,
    update: isSignedIn,
    delete: isAdminOrAbove,
  },
  upload: {
    mimeTypes: ["image/*", "video/*", "application/pdf"],
    imageSizes: [
      { name: "thumb", width: 320, height: 320, position: "centre" },
      { name: "card", width: 720 },
      { name: "hero", width: 1600 },
      { name: "ultra", width: 2400 },
    ],
    adminThumbnail: "thumb",
    focalPoint: true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      label: "Alt text",
      maxLength: 200,
      admin: { description: "Required. Describe the image for screen readers." },
    },
    {
      name: "credit",
      type: "text",
      label: "Photo credit",
      maxLength: 100,
      admin: { description: "Optional. Photographer or source attribution." },
    },
    {
      name: "tags",
      type: "text",
      hasMany: true,
      admin: { description: "Free-form tags for searching the library." },
    },
  ],
};
