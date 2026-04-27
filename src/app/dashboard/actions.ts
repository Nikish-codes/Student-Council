"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";

type Role = "super_admin" | "admin" | "council_member" | "club_lead" | "editor" | "viewer";
type OpsUser = { id: string; email?: string; name?: string; role?: Role; club?: string };
type AnyDoc = Record<string, unknown>;
type RelationshipID = string | number;

const payloadPromise = getPayload({ config });
const opsRoles: Role[] = ["super_admin", "admin", "editor", "council_member", "club_lead"];

function asString(v: FormDataEntryValue | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function asOptionalString(v: FormDataEntryValue | null | undefined): string | undefined {
  const value = asString(v);
  return value.length > 0 ? value : undefined;
}

function asOptionalNumber(v: FormDataEntryValue | null | undefined): number | undefined {
  const value = asString(v);
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function relationId(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "id" in v) return String((v as { id?: string | number }).id);
  return undefined;
}

function relationshipID(v: unknown): RelationshipID | undefined {
  const id = relationId(v);
  if (!id) return undefined;
  return /^\d+$/.test(id) ? Number(id) : id;
}

function toIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function textList(value: string): Array<{ word: string }> {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((word) => ({ word }));
}

function orderedIds(formData: FormData, prefix: string, count: number): RelationshipID[] {
  const seen = new Set<string>();
  const ids: RelationshipID[] = [];
  for (let i = 1; i <= count; i += 1) {
    const id = asString(formData.get(`${prefix}${i}`));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(relationshipID(id) ?? id);
  }
  return ids;
}

function heroCtas(formData: FormData) {
  return [1, 2, 3, 4]
    .map((i) => ({
      label: asString(formData.get(`heroCtaLabel${i}`)),
      href: asString(formData.get(`heroCtaHref${i}`)),
      variant: asString(formData.get(`heroCtaVariant${i}`)) || "primary",
    }))
    .filter((cta) => cta.label && cta.href)
    .slice(0, 4);
}

function textToLexical(text?: string) {
  const safe = (text || "").trim();
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: null,
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: null,
          children: safe
            ? [
                {
                  type: "text",
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: safe,
                  version: 1,
                },
              ]
            : [],
        },
      ],
    },
  };
}

function isAdmin(user: OpsUser): boolean {
  return user.role === "super_admin" || user.role === "admin";
}

function isClubLead(user: OpsUser): boolean {
  return user.role === "club_lead";
}

function requireAdmin(user: OpsUser) {
  if (!isAdmin(user)) {
    throw new Error("Only admins can do that from Operations.");
  }
}

function requireStaff(user: OpsUser) {
  if (isClubLead(user)) {
    throw new Error("Club leads can only manage their club events and recaps.");
  }
}

function requirePublisher(user: OpsUser, requestedStatus?: string) {
  if (!requestedStatus || requestedStatus === "draft" || requestedStatus === "pending_review") return;
  if (isAdmin(user)) return;
  throw new Error("Only admins can publish or archive events from Operations.");
}

async function requireOpsUser(): Promise<OpsUser> {
  const payload = await payloadPromise;
  const { user } = await payload.auth({ headers: await headers() });

  if (!user) {
    redirect("/admin/login?redirect=%2Fdashboard");
  }

  const authUser = user as AnyDoc;
  const role = authUser.role as Role | undefined;
  if (!role || !opsRoles.includes(role)) {
    throw new Error("Your Payload user role is not allowed to use Operations.");
  }

  let fullUser = authUser;
  if (authUser.id) {
    try {
      fullUser = (await payload.findByID({
        collection: "users",
        id: String(authUser.id),
        depth: 1,
        overrideAccess: true,
      } as never)) as AnyDoc;
    } catch {
      fullUser = authUser;
    }
  }

  return {
    id: String(fullUser.id ?? authUser.id),
    email: typeof fullUser.email === "string" ? fullUser.email : undefined,
    name: typeof fullUser.name === "string" ? fullUser.name : undefined,
    role: (fullUser.role as Role | undefined) ?? role,
    club: relationId(fullUser.club),
  };
}

async function assertOwnClubEvent(user: OpsUser, eventId: string) {
  if (!isClubLead(user)) return;
  if (!user.club) throw new Error("Your club lead account is not assigned to a club yet.");

  const payload = await payloadPromise;
  const event = (await payload.findByID({
    collection: "events",
    id: relationshipID(eventId) ?? eventId,
    depth: 0,
    overrideAccess: true,
  } as never)) as AnyDoc;
  if (relationId(event.club) !== user.club) {
    throw new Error("Club leads can only edit events for their assigned club.");
  }
}

async function syncHomepageFlagship(eventId: string, place: string) {
  if (place !== "flagship") return;
  const payload = await payloadPromise;
  const current = (await payload.findGlobal({
    slug: "homepage-config",
    overrideAccess: true,
  } as never)) as AnyDoc;

  await payload.updateGlobal({
    slug: "homepage-config",
    data: {
      ...current,
      flagshipEvent: relationshipID(eventId) ?? eventId,
    },
    overrideAccess: true,
  } as never);
}

function revalidateOperations() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath("/archive");
  revalidatePath("/clubs");
}

export async function createEventAction(formData: FormData) {
  const user = await requireOpsUser();
  const payload = await payloadPromise;
  const title = asString(formData.get("title"));
  const status = isClubLead(user) ? "pending_review" : asString(formData.get("status")) || "draft";
  requirePublisher(user, status);

  const slug = slugify(asString(formData.get("slug")) || title);
  const banner = relationshipID(formData.get("banner"));
  const date = toIso(asString(formData.get("date")));
  const club = isClubLead(user) ? relationshipID(user.club) : relationshipID(formData.get("club"));

  if (isClubLead(user) && !club) {
    throw new Error("Your club lead account is not assigned to a club yet.");
  }

  if (!title || !slug || banner == null || !date) {
    throw new Error("Title, slug, date, and banner are required.");
  }

  const data: Record<string, unknown> = {
    title,
    slug,
    status,
    category: asString(formData.get("category")) || "flagship",
    date,
    venue: asString(formData.get("venue")),
    excerpt: asString(formData.get("excerpt")),
    description: textToLexical(asString(formData.get("description"))),
    banner,
    featured: checkbox(formData, "featured"),
  };
  const endDate = toIso(asOptionalString(formData.get("endDate")));
  const videoUrl = asOptionalString(formData.get("videoUrl"));
  const registrationUrl = asOptionalString(formData.get("registrationUrl"));
  const attendees = asOptionalNumber(formData.get("attendees"));
  const organizer = relationshipID(user.id);
  if (endDate) data.endDate = endDate;
  if (videoUrl) data.videoUrl = videoUrl;
  if (registrationUrl) data.registrationUrl = registrationUrl;
  if (attendees != null) data.attendees = attendees;
  if (organizer != null) data.organizer = organizer;
  if (club != null) data.club = club;

  const event = (await payload.create({
    collection: "events",
    data,
    overrideAccess: true,
  } as never)) as AnyDoc;

  if (isAdmin(user)) {
    await syncHomepageFlagship(String(event.id), asString(formData.get("homepagePlacement")));
  }
  revalidateOperations();
  redirect(isClubLead(user) ? "/dashboard?saved=event-submitted" : "/dashboard?saved=event-created");
}

export async function updateEventAction(formData: FormData) {
  const user = await requireOpsUser();
  const payload = await payloadPromise;
  const id = asString(formData.get("id"));
  const title = asString(formData.get("title"));

  if (!id || !title) throw new Error("Event ID and title are required.");
  await assertOwnClubEvent(user, id);

  const requestedStatus = isClubLead(user) ? "pending_review" : asString(formData.get("status"));
  requirePublisher(user, requestedStatus);

  const data: Record<string, unknown> = {
    title,
    slug: slugify(asString(formData.get("slug")) || title),
    status: requestedStatus || "draft",
    category: asString(formData.get("category")),
    date: toIso(asString(formData.get("date"))),
    endDate: toIso(asOptionalString(formData.get("endDate"))),
    venue: asString(formData.get("venue")),
    excerpt: asString(formData.get("excerpt")),
    description: textToLexical(asString(formData.get("description"))),
    videoUrl: asOptionalString(formData.get("videoUrl")),
    registrationUrl: asOptionalString(formData.get("registrationUrl")),
    attendees: asOptionalNumber(formData.get("attendees")),
    featured: checkbox(formData, "featured"),
  };

  const banner = relationshipID(formData.get("banner"));
  if (banner != null) data.banner = banner;

  if (isClubLead(user)) {
    const club = relationshipID(user.club);
    if (club != null) data.club = club;
  } else {
    const club = relationshipID(formData.get("club"));
    data.club = club || null;
  }

  await payload.update({
    collection: "events",
    id: relationshipID(id) ?? id,
    data,
    overrideAccess: true,
  } as never);

  if (isAdmin(user)) {
    await syncHomepageFlagship(id, asString(formData.get("homepagePlacement")));
  }
  revalidateOperations();
  redirect(isClubLead(user) ? "/dashboard?saved=event-submitted" : "/dashboard?saved=event-updated");
}

export async function approveEventAction(formData: FormData) {
  const user = await requireOpsUser();
  requireAdmin(user);
  const id = asString(formData.get("id"));
  if (!id) throw new Error("Event ID is required.");

  const payload = await payloadPromise;
  await payload.update({
    collection: "events",
    id: relationshipID(id) ?? id,
    data: { status: "published" },
    overrideAccess: true,
  } as never);

  revalidateOperations();
  redirect("/dashboard?saved=event-approved");
}

export async function createRecapAction(formData: FormData) {
  const user = await requireOpsUser();
  const payload = await payloadPromise;
  const title = asString(formData.get("title"));
  const slug = slugify(asString(formData.get("slug")) || title);
  const eventId = asString(formData.get("event"));
  const event = relationshipID(eventId);
  const heroMedia = relationshipID(formData.get("heroMedia"));

  if (!title || !slug || event == null || heroMedia == null) {
    throw new Error("Title, slug, event, and hero poster are required.");
  }
  await assertOwnClubEvent(user, eventId);

  const recap = (await payload.create({
    collection: "recaps",
    data: {
      title,
      slug,
      event,
      kicker: asOptionalString(formData.get("kicker")),
      blurb: asOptionalString(formData.get("blurb")),
      publishedAt: toIso(asString(formData.get("publishedAt"))) || new Date().toISOString(),
      heroMedia,
      heroVideoUrl: asOptionalString(formData.get("heroVideoUrl")),
      _status: isClubLead(user) ? "draft" : "published",
    },
    overrideAccess: true,
  } as never)) as AnyDoc;

  if (checkbox(formData, "pinToVault") && isAdmin(user)) {
    const current = (await payload.findGlobal({
      slug: "homepage-config",
      overrideAccess: true,
    } as never)) as AnyDoc;
    const existing = Array.isArray(current.vaultStories) ? current.vaultStories : [];
    await payload.updateGlobal({
      slug: "homepage-config",
      data: {
        ...current,
        vaultStories: [relationshipID(recap.id) ?? recap.id, ...existing.map((item) => relationshipID(item) || item)].slice(0, 8),
      },
      overrideAccess: true,
    } as never);
  }

  revalidateOperations();
  redirect("/dashboard?saved=vault-story-created");
}

export async function updateAnnouncementAction(formData: FormData) {
  const user = await requireOpsUser();
  requireStaff(user);
  const payload = await payloadPromise;
  const id = asString(formData.get("id"));
  const title = asString(formData.get("title"));
  if (!id || !title) throw new Error("Announcement ID and title are required.");

  await payload.update({
    collection: "announcements",
    id,
    data: {
      title,
      href: asOptionalString(formData.get("href")),
      date: toIso(asString(formData.get("date"))) || new Date().toISOString(),
      pinned: checkbox(formData, "pinned"),
    },
    overrideAccess: true,
  } as never);

  revalidateOperations();
  redirect("/dashboard?saved=announcement-updated");
}

export async function createAnnouncementAction(formData: FormData) {
  const user = await requireOpsUser();
  requireStaff(user);
  const payload = await payloadPromise;
  const title = asString(formData.get("title"));
  if (!title) throw new Error("Announcement title is required.");

  await payload.create({
    collection: "announcements",
    data: {
      title,
      href: asOptionalString(formData.get("href")),
      date: toIso(asString(formData.get("date"))) || new Date().toISOString(),
      pinned: checkbox(formData, "pinned"),
    },
    overrideAccess: true,
  } as never);

  revalidateOperations();
  redirect("/dashboard?saved=announcement-created");
}

export async function updateHomepageComposerAction(formData: FormData) {
  const user = await requireOpsUser();
  requireAdmin(user);
  const payload = await payloadPromise;
  const current = (await payload.findGlobal({
    slug: "homepage-config",
    depth: 0,
    overrideAccess: true,
  } as never)) as AnyDoc;
  const currentHero = (current.hero as AnyDoc | undefined) ?? {};

  const ctas = heroCtas(formData);
  await payload.updateGlobal({
    slug: "homepage-config",
    data: {
      ...current,
      hero: {
        ...currentHero,
        kicker: asString(formData.get("heroKicker")),
        headline: asString(formData.get("heroHeadline")),
        sublineLead: asString(formData.get("heroSublineLead")),
        sublineWords: textList(asString(formData.get("heroSublineWords"))),
        subParagraph: asString(formData.get("heroSubParagraph")),
        marqueeText: asString(formData.get("heroMarqueeText")),
        ctas,
      },
      featuredClubs: orderedIds(formData, "featuredClub", 8),
      vaultStories: orderedIds(formData, "vaultStory", 8),
    },
    overrideAccess: true,
  } as never);

  revalidateOperations();
  redirect("/dashboard?saved=homepage-composed");
}
