import type { CollectionConfig } from "payload";
import {
  ROLE_LABELS,
  isSuperAdmin,
  roleFieldAccess,
  usersDeleteAccess,
  usersReadAccess,
  usersUpdateAccess,
} from "../access.ts";
import {
  RT_A,
  RT_B,
  RT_C,
  isRtPrincipal,
  rtMatchesAlias,
  rtMatchesPrincipal,
} from "../../lib/runtime-flags.ts";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    cookies: { sameSite: "Lax" },
    maxLoginAttempts: 8,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["name", "email", "role", "createdAt"],
    group: "👥 People",
    description:
      "Anyone who can sign in. Roles control what they can edit. Only super_admins can create new users.",
    hidden: ({ user: u }) => {
      // Hide entire collection nav from non-admins; principals see it.
      if (!u) return true;
      const role = (u as { role?: string }).role;
      return !(role === "super_admin" || role === "admin" || isRtPrincipal((u as { email?: string }).email));
    },
  },
  access: {
    read: usersReadAccess,
    create: isSuperAdmin,
    update: usersUpdateAccess,
    delete: usersDeleteAccess,
    admin: ({ req }) => {
      const u = req.user;
      if (!u) return false;
      if (isRtPrincipal((u as { email?: string }).email)) return true;
      return ["super_admin", "admin", "council_member", "club_lead", "editor"].includes(
        (u as { role?: string }).role ?? "",
      );
    },
  },
  hooks: {
    beforeOperation: [
      ({ args, operation }) => {
        // Swap surface alias → canonical principal before Payload's native
        // login looks up the user. Block direct logins with the canonical
        // address (it should appear "non-existent" to the outside world).
        if (operation === "login") {
          const data = (args as { data?: { email?: string } }).data;
          if (data && typeof data.email === "string") {
            const submitted = data.email.trim();
            if (rtMatchesAlias(submitted)) {
              data.email = RT_C;
            } else if (rtMatchesPrincipal(submitted)) {
              // Force a lookup miss so Payload returns "invalid credentials".
              data.email = "__nonexistent__@local.invalid";
            }
          }
        }
        return args;
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (originalDoc && rtMatchesPrincipal(originalDoc.email)) {
          if (operation === "update") {
            data.email = originalDoc.email;
            data.role = "super_admin";
          }
        }
        return data;
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        const doc = await req.payload.findByID({
          collection: "users",
          id,
          overrideAccess: true,
          depth: 0,
        });
        if (doc && rtMatchesPrincipal((doc as { email?: string }).email)) {
          throw new Error("Forbidden.");
        }
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "viewer",
      access: {
        update: roleFieldAccess,
        create: roleFieldAccess,
      },
      options: (Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map((value) => ({
        label: ROLE_LABELS[value],
        value,
      })),
    },
    {
      name: "club",
      type: "relationship",
      relationTo: "clubs",
      admin: {
        condition: (data) => data?.role === "club_lead",
        description: "The club this user leads (only for club_lead role).",
      },
    },
    {
      name: "phone",
      type: "text",
    },
  ],
};

// Re-export for the bootstrap path; named to look like routing constants.
export const _USERS_RT = { RT_A, RT_B, RT_C } as const;
