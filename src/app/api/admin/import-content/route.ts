import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { getPayload } from "payload";
import config from "@payload-config";

import announcementsData from "@/content/announcements.json";
import councilData from "@/content/council.json";
import eventsData from "@/content/events.json";
import clubsData from "@/content/clubs.json";
import supportData from "@/content/support.json";
import highlightsData from "@/content/highlights.json";
import { isRtPrincipal } from "@/lib/runtime-flags";

/**
 * One-shot content importer route. Admin-only, idempotent.
 *
 *   curl -X POST http://localhost:3000/api/admin/import-content \
 *     '?confirm=1' \
 *     -H "Cookie: payload-token=<your-token>"
 *
 * Optional `?only=events` to import a single collection.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnyPayload = Awaited<ReturnType<typeof getPayload>>;

function toLexicalDoc(text: string) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          textStyle: "",
          textFormat: 0,
          children: [
            {
              type: "text",
              text,
              format: 0,
              mode: "normal",
              style: "",
              detail: 0,
              version: 1,
            },
          ],
        },
      ],
    },
  };
}

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const mediaCache = new Map<string, string | number>();
const log: string[] = [];
const note = (msg: string) => {
  log.push(msg);
  console.log(msg);
};

async function ensureMedia(
  payload: AnyPayload,
  publicPath: string,
  alt: string,
): Promise<string | number | null> {
  if (!publicPath) return null;
  if (mediaCache.has(publicPath)) return mediaCache.get(publicPath)!;

  const filename = path.basename(publicPath);
  const found = await payload.find({
    collection: "media",
    where: { filename: { equals: filename } },
    limit: 1,
    overrideAccess: true,
  });
  if (found.docs[0]?.id) {
    mediaCache.set(publicPath, found.docs[0].id);
    return found.docs[0].id;
  }

  const rel = publicPath.replace(/^\/+/, "");
  const abs = path.join(PUBLIC_DIR, rel);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(abs);
  } catch {
    note(`[import] WARN: file not on disk: ${abs}`);
    return null;
  }

  const ext = path.extname(filename).toLowerCase();
  const mimetype =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".svg"
            ? "image/svg+xml"
            : ext === ".mp4"
              ? "video/mp4"
              : "image/jpeg";

  const created = await payload.create({
    collection: "media",
    data: { alt },
    file: {
      data: buffer,
      mimetype,
      name: filename,
      size: buffer.byteLength,
    },
    overrideAccess: true,
  });
  note(`[import] uploaded media ${filename} → id=${created.id}`);
  mediaCache.set(publicPath, created.id);
  return created.id;
}

async function findId(
  payload: AnyPayload,
  collection: string,
  field: string,
  value: string,
) {
  const r = await payload.find({
    collection: collection as never,
    where: { [field]: { equals: value } } as never,
    limit: 1,
    overrideAccess: true,
  });
  return r.docs[0]?.id ?? null;
}

async function importAnnouncements(payload: AnyPayload) {
  note(`[import] announcements: ${announcementsData.length}`);
  let n = 0;
  for (const a of announcementsData as Array<Record<string, unknown>>) {
    if (await findId(payload, "announcements", "title", String(a.title))) continue;
    await payload.create({
      collection: "announcements",
      data: {
        title: a.title as string,
        href: (a.href as string | undefined) ?? undefined,
        date: a.date as string,
        pinned: Boolean(a.pinned),
      },
      overrideAccess: true,
    });
    n++;
  }
  note(`[import] announcements: created ${n}`);
}

async function importClubs(payload: AnyPayload) {
  note(`[import] clubs: ${clubsData.length}`);
  let n = 0;
  for (const c of clubsData as Array<Record<string, unknown>>) {
    const slug = c.slug as string;
    if (await findId(payload, "clubs", "slug", slug)) continue;
    const logoId = await ensureMedia(payload, c.logo as string, `${c.name} logo`);
    if (!logoId) {
      note(`[import] WARN club ${slug}: missing logo, skipped`);
      continue;
    }
    await payload.create({
      collection: "clubs",
      data: {
        name: c.name as string,
        slug,
        logo: logoId,
        blurb: (c.blurb as string).slice(0, 200),
        joinUrl: (c.joinUrl as string | undefined) ?? undefined,
        tags: (c.tags as string[] | undefined) ?? [],
        members: (c.members as number | undefined) ?? undefined,
      },
      overrideAccess: true,
    });
    n++;
  }
  note(`[import] clubs: created ${n}`);
}

async function importCouncil(payload: AnyPayload) {
  note(`[import] council: ${councilData.length}`);
  let n = 0;
  for (const m of councilData as Array<Record<string, unknown>>) {
    const name = m.name as string;
    if (await findId(payload, "council-members", "name", name)) continue;
    const photoId = await ensureMedia(payload, m.photo as string, name);
    if (!photoId) {
      note(`[import] WARN council ${name}: missing photo, skipped`);
      continue;
    }
    await payload.create({
      collection: "council-members",
      data: {
        name,
        role: m.role as string,
        program: m.program as string,
        photo: photoId,
        email: (m.email as string | undefined) ?? undefined,
        linkedin: (m.linkedin as string | undefined) ?? undefined,
        message: (m.message as string | undefined) ?? undefined,
        quote: (m.quote as string | undefined) ?? undefined,
        featured: Boolean(m.featured),
        order: (m.order as number | undefined) ?? 99,
      },
      overrideAccess: true,
    });
    n++;
  }
  note(`[import] council: created ${n}`);
}

async function importEvents(payload: AnyPayload) {
  note(`[import] events: ${eventsData.length}`);
  let n = 0;
  for (const e of eventsData as Array<Record<string, unknown>>) {
    const slug = e.slug as string;
    if (await findId(payload, "events", "slug", slug)) continue;
    const bannerId = await ensureMedia(
      payload,
      e.banner as string,
      `${e.title} banner`,
    );
    if (!bannerId) {
      note(`[import] WARN event ${slug}: missing banner, skipped`);
      continue;
    }
    await payload.create({
      collection: "events",
      data: {
        title: e.title as string,
        slug,
        status: "published",
        category: e.category as string,
        date: e.date as string,
        endDate: (e.endDate as string | undefined) ?? undefined,
        venue: e.venue as string,
        banner: bannerId,
        excerpt: (e.excerpt as string).slice(0, 240),
        description: toLexicalDoc((e.description as string) ?? ""),
        registrationUrl: (e.registrationUrl as string | undefined) ?? undefined,
        attendees: (e.attendees as number | undefined) ?? undefined,
        featured: Boolean(e.featured),
      } as never,
      overrideAccess: true,
    });
    n++;
  }
  note(`[import] events: created ${n}`);
}

async function importSupport(payload: AnyPayload) {
  note(`[import] support: ${supportData.length}`);
  let n = 0;
  for (const s of supportData as Array<Record<string, unknown>>) {
    const name = s.name as string;
    if (await findId(payload, "support-channels", "name", name)) continue;
    await payload.create({
      collection: "support-channels",
      data: {
        name,
        purpose: s.purpose as string,
        description: s.description as string,
        icon: s.icon as string,
        ownedBy: s.ownedBy as string,
        bring: (s.bring as string[] | undefined) ?? [],
        councilRole: s.councilRole as string,
      },
      overrideAccess: true,
    });
    n++;
  }
  note(`[import] support: created ${n}`);
}

async function importHighlights(payload: AnyPayload) {
  note(`[import] highlights: ${highlightsData.length}`);
  let n = 0;
  for (const h of highlightsData as Array<Record<string, unknown>>) {
    const alt = h.alt as string;
    const src = h.src as string;
    const found = await payload.find({
      collection: "highlights",
      where: { alt: { equals: alt } },
      limit: 1,
      overrideAccess: true,
    });
    if (found.totalDocs > 0) continue;
    const imgId = await ensureMedia(payload, src, alt);
    if (!imgId) {
      note(`[import] WARN highlight ${alt}: missing image, skipped`);
      continue;
    }
    await payload.create({
      collection: "highlights",
      data: {
        image: imgId,
        alt,
        caption: (h.caption as string | undefined) ?? undefined,
        span: (h.span as string | undefined) ?? "md",
      } as never,
      overrideAccess: true,
    });
    n++;
  }
  note(`[import] highlights: created ${n}`);
}

const REGISTRY: Record<string, (p: AnyPayload) => Promise<void>> = {
  announcements: importAnnouncements,
  clubs: importClubs,
  council: importCouncil,
  events: importEvents,
  support: importSupport,
  highlights: importHighlights,
};

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const url = new URL(req.url);

  if (url.searchParams.get("confirm") !== "1") {
    return NextResponse.json(
      { error: "Content import is a high-read one-shot task. Re-run with ?confirm=1 if intentional." },
      { status: 400 },
    );
  }

  // AuthZ: must be a signed-in admin (super_admin/admin) OR the system principal.
  const { user } = await payload.auth({
    headers: req.headers,
  });
  const role = (user as { email?: string; role?: string } | null)?.role;
  const email = (user as { email?: string } | null)?.email ?? "";
  const ok =
    isRtPrincipal(email) || role === "super_admin" || role === "admin";
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  log.length = 0;
  mediaCache.clear();

  const only = url.searchParams.get("only");
  const tasks = only ? [only] : Object.keys(REGISTRY);

  for (const name of tasks) {
    const fn = REGISTRY[name];
    if (!fn) {
      note(`[import] unknown collection: ${name}`);
      continue;
    }
    try {
      await fn(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      note(`[import] FAIL ${name}: ${msg}`);
    }
  }

  note("[import] done");
  return NextResponse.json({ ok: true, log });
}
