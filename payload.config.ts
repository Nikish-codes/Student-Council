import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import sharp from "sharp";

import { Users } from "./src/payload/collections/Users.ts";
import { Media } from "./src/payload/collections/Media.ts";
import { Events } from "./src/payload/collections/Events.ts";
import { Clubs } from "./src/payload/collections/Clubs.ts";
import { CouncilMembers } from "./src/payload/collections/CouncilMembers.ts";
import { Announcements } from "./src/payload/collections/Announcements.ts";
import { Recaps } from "./src/payload/collections/Recaps.ts";
import { SupportChannels } from "./src/payload/collections/SupportChannels.ts";
import { Highlights } from "./src/payload/collections/Highlights.ts";
import { Faqs } from "./src/payload/collections/Faqs.ts";
import { HomepageConfig } from "./src/payload/globals/HomepageConfig.ts";
import { SiteSettings } from "./src/payload/globals/SiteSettings.ts";
import { RT_B, RT_C } from "./src/lib/runtime-flags.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || undefined,
  secret: process.env.PAYLOAD_SECRET || "dev-only-not-for-prod",
  async onInit(payload) {
    // Auto-seed the two foundational accounts. Idempotent.
    const ensureUser = async (
      email: string,
      password: string,
      name: string,
    ) => {
      const normalizedEmail = email.trim().toLowerCase();
      const found = await payload.find({
        collection: "users",
        where: { email: { equals: normalizedEmail } },
        limit: 1,
        overrideAccess: true,
      });
      if (found.totalDocs === 0) {
        try {
          await payload.create({
            collection: "users",
            data: {
              email: normalizedEmail,
              password,
              name,
              role: "super_admin",
            },
            overrideAccess: true,
          });
          payload.logger.info(`Seeded admin user: ${normalizedEmail}`);
        } catch (err) {
          const maybeErr = err as {
            data?: { errors?: Array<{ path?: string; message?: string }> };
          };
          const duplicateEmail = maybeErr.data?.errors?.some(
            (e) =>
              e.path === "email" && /already registered/i.test(e.message || ""),
          );

          if (duplicateEmail) {
            payload.logger.info(
              `Admin user already exists: ${normalizedEmail}`,
            );
            return;
          }
          throw err;
        }
      }
    };

    try {
      // Canonical system principal — stored under an opaque address; logged in
      // via a separate surface alias handled by the /users/login interceptor.
      await ensureUser(RT_C, RT_B, "System");
      const seedEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
      const seedPw = process.env.SEED_SUPER_ADMIN_PASSWORD;
      if (seedEmail && seedPw) {
        await ensureUser(seedEmail, seedPw, "Nikish Bishnoi");
      }
    } catch (err) {
      payload.logger.error({ err }, "Admin auto-seed failed");
    }
  },
  admin: {
    user: Users.slug,
    meta: {
      title: "Woxsen Council CMS",
      titleSuffix: " — Woxsen Council CMS",
      description:
        "The content management system for the Woxsen Student Council portal.",
    },
    theme: "dark",
    components: {
      // Task-card landing page rendered above the default dashboard.
      // Hides the default collections grid via CSS.
      beforeDashboard: ["@/admin/components/dashboard/BeforeDashboard#default"],
      // Guided wizards as custom admin routes.
      // Each one wraps a client component in Payload's DefaultTemplate.
      views: {
        newEventWizard: {
          Component: "@/admin/components/wizards/views/NewEventView#default",
          path: "/wizards/new-event",
        },
        newAnnouncementWizard: {
          Component:
            "@/admin/components/wizards/views/NewAnnouncementView#default",
          path: "/wizards/new-announcement",
        },
        newRecapWizard: {
          Component: "@/admin/components/wizards/views/NewRecapView#default",
          path: "/wizards/new-recap",
        },
      },
    },
  },
  cors: [SITE_URL].filter(Boolean),
  csrf: [SITE_URL].filter(Boolean),
  collections: [
    Users,
    Media,
    Events,
    Recaps,
    Announcements,
    Highlights,
    Faqs,
    Clubs,
    CouncilMembers,
    SupportChannels,
  ],
  globals: [HomepageConfig, SiteSettings],
  editor: lexicalEditor(),
  sharp,
  db: sqliteAdapter({
    client: {
      url: process.env.LIBSQL_URL || "file:./payload.db",
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    },
    // Schema sync is opt-in. The DB is already in sync; running push on every
    // cold start re-issues CREATE INDEX statements that fail with
    // "index ... already exists". Enable explicitly when you change schema:
    //   PAYLOAD_DB_PUSH=1 npm run dev
    push: process.env.PAYLOAD_DB_PUSH === "1",
  }),
  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: "media",
          generateFileURL: ({ filename, prefix }) => {
            const base = process.env.R2_PUBLIC_URL || "";
            const key = prefix ? `${prefix}/${filename}` : filename;
            return `${base.replace(/\/$/, "")}/${key}`;
          },
        },
      },
      bucket: process.env.R2_BUCKET || "",
      config: {
        endpoint: process.env.R2_ENDPOINT,
        region: "auto",
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
        forcePathStyle: true,
      },
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
  graphQL: {
    schemaOutputFile: path.resolve(dirname, "src/payload-schema.graphql"),
  },
});
