import type { GlobalConfig } from "payload";
import { isAdminOrAbove } from "../access.ts";
import { revalidateAfterChange } from "../hooks/revalidate.ts";

/**
 * Site-wide settings — applies everywhere, not just the homepage.
 * Campus location, social links, grievance form categories, etc.
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  admin: {
    group: "⚙️ Settings",
    description:
      "💡 Site-wide settings that apply everywhere — not just the homepage. Brand name, social links, contact email, campus location (used by the live status badge in the hero), and the categories shown in the grievance form on /support.",
  },
  access: {
    read: () => true,
    update: isAdminOrAbove,
  },
  versions: { max: 10 },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Brand",
          fields: [
            {
              name: "siteName",
              type: "text",
              required: true,
              maxLength: 80,
              defaultValue: "Woxsen Student Council",
            },
            { name: "tagline", type: "text", maxLength: 140 },
            {
              name: "contactEmail",
              type: "email",
              admin: {
                description: "Public contact email shown in the footer.",
              },
            },
            {
              name: "instagramUrl",
              type: "text",
              admin: { description: "Instagram profile URL." },
              validate: (val: unknown) => {
                if (!val) return true;
                if (typeof val !== "string") return "Must be a URL.";
                try {
                  const u = new URL(val);
                  if (!/^https?:$/.test(u.protocol))
                    return "Must be http or https.";
                  return true;
                } catch {
                  return "Enter a full URL like https://instagram.com/...";
                }
              },
            },
            {
              name: "linkedinUrl",
              type: "text",
              admin: { description: "LinkedIn page URL." },
              validate: (val: unknown) => {
                if (!val) return true;
                if (typeof val !== "string") return "Must be a URL.";
                try {
                  const u = new URL(val);
                  if (!/^https?:$/.test(u.protocol))
                    return "Must be http or https.";
                  return true;
                } catch {
                  return "Enter a full URL like https://linkedin.com/...";
                }
              },
            },
          ],
        },
        {
          label: "Campus",
          description: "Used by the live status badge in the hero.",
          fields: [
            {
              name: "campus",
              type: "group",
              fields: [
                {
                  name: "name",
                  type: "text",
                  maxLength: 60,
                  defaultValue: "Hyderabad",
                },
                {
                  name: "coordinates",
                  type: "text",
                  maxLength: 40,
                  defaultValue: "17.5°N 78.4°E",
                  admin: {
                    description: "Display string only — e.g. '17.5°N 78.4°E'.",
                  },
                },
                {
                  name: "timezone",
                  type: "select",
                  defaultValue: "Asia/Kolkata",
                  options: [
                    { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
                    { label: "Asia/Dubai", value: "Asia/Dubai" },
                    { label: "Asia/Singapore", value: "Asia/Singapore" },
                    { label: "Europe/London (GMT)", value: "Europe/London" },
                    {
                      label: "America/New_York (EST)",
                      value: "America/New_York",
                    },
                    {
                      label: "America/Los_Angeles (PST)",
                      value: "America/Los_Angeles",
                    },
                  ],
                },
                {
                  name: "timezoneAbbr",
                  type: "text",
                  maxLength: 8,
                  defaultValue: "IST",
                  admin: { description: "Short label printed after the time." },
                },
              ],
            },
          ],
        },
        {
          label: "Grievance form",
          description:
            "Categories shown in the dropdown on /support#grievance-form.",
          fields: [
            {
              name: "grievanceCategories",
              type: "array",
              minRows: 1,
              maxRows: 12,
              admin: {
                description:
                  "Each category becomes one option in the form dropdown.",
              },
              defaultValue: [
                { value: "harassment", label: "Harassment / discrimination" },
                { value: "academic", label: "Academic concern" },
                { value: "facility", label: "Facility / infrastructure" },
                { value: "other", label: "Other" },
              ],
              fields: [
                {
                  name: "value",
                  type: "text",
                  required: true,
                  maxLength: 40,
                  admin: {
                    description: "Internal value (lowercase, no spaces).",
                  },
                },
                { name: "label", type: "text", required: true, maxLength: 80 },
              ],
            },
            {
              name: "grievanceMailTo",
              type: "email",
              defaultValue: "council@woxsen.edu.in",
              admin: {
                description:
                  "Email address that receives grievance submissions.",
              },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange(["/", "/support"])],
  },
};
