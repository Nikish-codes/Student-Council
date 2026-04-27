import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Home,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Megaphone,
  PencilLine,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveEventAction,
  createAnnouncementAction,
  createEventAction,
  createRecapAction,
  updateAnnouncementAction,
  updateEventAction,
  updateHomepageComposerAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Council Ops Dashboard",
  description: "Role-aware shadcn-style operations tools for the Council CMS.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ saved?: string }>;
};

type Role = "super_admin" | "admin" | "council_member" | "club_lead" | "editor" | "viewer";
type AnyDoc = Record<string, unknown>;

type OpsUser = {
  id: string;
  email?: string;
  name?: string;
  role?: Role;
  club?: string;
  clubName?: string;
};

type MediaOption = {
  id: string;
  label: string;
  url?: string;
};

type ClubOption = {
  id: string;
  name: string;
  slug: string;
};

type EventDoc = {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  date: string;
  endDate?: string;
  venue: string;
  excerpt: string;
  description: string;
  banner?: string;
  videoUrl?: string;
  registrationUrl?: string;
  attendees?: number;
  featured: boolean;
  club?: string;
  clubName?: string;
};

type RecapDoc = {
  id: string;
  title: string;
  slug: string;
  event?: string;
  eventTitle?: string;
  kicker?: string;
  blurb?: string;
  publishedAt?: string;
  heroMedia?: string;
  heroVideoUrl?: string;
};

type AnnouncementDoc = {
  id: string;
  title: string;
  href?: string;
  date: string;
  pinned: boolean;
};

type HomepageComposerData = {
  hero: {
    kicker: string;
    headline: string;
    sublineLead: string;
    sublineWords: string[];
    subParagraph: string;
    marqueeText: string;
    ctas: Array<{ label: string; href: string; variant: string }>;
  };
  featuredClubIds: string[];
  vaultStoryIds: string[];
};

const categories = ["tech", "cultural", "sports", "flagship", "academic"];
const statuses = ["draft", "pending_review", "published", "archived"];
const nonAdminStatuses = ["draft", "pending_review"];
const ctaVariants = ["primary", "outline", "ghost"];
const payloadPromise = getPayload({ config });
const opsRoles: Role[] = ["super_admin", "admin", "editor", "council_member", "club_lead"];

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

function relationId(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "id" in v) return String((v as { id?: string | number }).id);
  return undefined;
}

function relationTitle(v: unknown, fallback = ""): string {
  if (!v || typeof v !== "object") return fallback;
  const doc = v as AnyDoc;
  return asString(doc.title) || asString(doc.name) || fallback;
}

function mediaLabel(v: AnyDoc): string {
  return asString(v.alt) || asString(v.filename) || asString(v.url) || `Media ${asString(v.id)}`;
}

function lexicalToText(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  const root = (v as { root?: { children?: unknown[] } }).root;
  if (!root?.children) return "";
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; children?: unknown[] };
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (n.type === "paragraph" || n.type === "heading") parts.push("\n");
  };
  root.children.forEach(walk);
  return parts.join("").trim();
}

function dateInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function prettyDate(value?: string): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isAdmin(user: OpsUser) {
  return user.role === "super_admin" || user.role === "admin";
}

function isClubLead(user: OpsUser) {
  return user.role === "club_lead";
}

function roleLabel(role?: Role) {
  return {
    super_admin: "Super admin",
    admin: "Admin",
    council_member: "Council member",
    editor: "Editor",
    club_lead: "Club president / lead",
    viewer: "Viewer",
  }[role || "viewer"];
}

function statusClass(status: string) {
  return {
    published: "border-white/30 bg-white/10 text-white",
    draft: "border-white/15 bg-white/[0.04] text-slate-300",
    pending_review: "border-white/25 bg-white/[0.08] text-slate-100",
    archived: "border-white/15 bg-white/[0.03] text-slate-400",
  }[status] || "";
}

function relationIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => relationId(item)).filter((item): item is string => Boolean(item));
}

async function getOpsUser(payload: Awaited<typeof payloadPromise>): Promise<OpsUser> {
  const { user } = await payload.auth({ headers: await headers() });

  if (!user) {
    redirect("/admin/login?redirect=%2Fdashboard");
  }

  const authUser = user as AnyDoc;
  const role = authUser.role as Role | undefined;
  if (!role || !opsRoles.includes(role)) {
    redirect("/");
  }

  let fullUser = authUser;
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

  const club = fullUser.club;
  return {
    id: asString(fullUser.id || authUser.id),
    email: asString(fullUser.email) || undefined,
    name: asString(fullUser.name) || undefined,
    role: (fullUser.role as Role | undefined) || role,
    club: relationId(club),
    clubName: relationTitle(club),
  };
}

async function getOpsData() {
  const payload = await payloadPromise;
  const user = await getOpsUser(payload);
  const clubWhere = isClubLead(user) && user.club ? { club: { equals: user.club } } : undefined;

  const [events, announcements, recaps, media, homepage, clubs] = await Promise.all([
    payload.find({
      collection: "events",
      limit: 100,
      depth: 1,
      sort: "-date",
      where: clubWhere,
      overrideAccess: true,
    } as never),
    payload.find({
      collection: "announcements",
      limit: 20,
      sort: "-date",
      overrideAccess: true,
    } as never),
    payload.find({
      collection: "recaps",
      limit: 80,
      depth: 2,
      sort: "-publishedAt",
      overrideAccess: true,
    } as never),
    payload.find({
      collection: "media",
      limit: 120,
      sort: "-createdAt",
      overrideAccess: true,
    } as never),
    payload.findGlobal({
      slug: "homepage-config",
      depth: 1,
      overrideAccess: true,
    } as never),
    payload.find({
      collection: "clubs",
      limit: 100,
      depth: 0,
      sort: "name",
      overrideAccess: true,
    } as never),
  ]);

  const mappedEvents: EventDoc[] = (events.docs as AnyDoc[]).map((doc) => ({
    id: asString(doc.id),
    title: asString(doc.title),
    slug: asString(doc.slug),
    status: asString(doc.status) || "draft",
    category: asString(doc.category) || "flagship",
    date: asString(doc.date),
    endDate: asString(doc.endDate) || undefined,
    venue: asString(doc.venue),
    excerpt: asString(doc.excerpt),
    description: lexicalToText(doc.description),
    banner: relationId(doc.banner),
    videoUrl: asString(doc.videoUrl) || undefined,
    registrationUrl: asString(doc.registrationUrl) || undefined,
    attendees: typeof doc.attendees === "number" ? doc.attendees : undefined,
    featured: Boolean(doc.featured),
    club: relationId(doc.club),
    clubName: relationTitle(doc.club),
  }));

  const eventIds = new Set(mappedEvents.map((event) => event.id));
  const mappedRecaps: RecapDoc[] = (recaps.docs as AnyDoc[])
    .map((doc) => ({
      id: asString(doc.id),
      title: asString(doc.title),
      slug: asString(doc.slug),
      event: relationId(doc.event),
      eventTitle: relationTitle(doc.event),
      kicker: asString(doc.kicker) || undefined,
      blurb: asString(doc.blurb) || undefined,
      publishedAt: asString(doc.publishedAt) || undefined,
      heroMedia: relationId(doc.heroMedia),
      heroVideoUrl: asString(doc.heroVideoUrl) || undefined,
    }))
    .filter((recap) => !isClubLead(user) || (recap.event ? eventIds.has(recap.event) : false));

  const mappedAnnouncements: AnnouncementDoc[] = (announcements.docs as AnyDoc[]).map((doc) => ({
    id: asString(doc.id),
    title: asString(doc.title),
    href: asString(doc.href) || undefined,
    date: asString(doc.date),
    pinned: Boolean(doc.pinned),
  }));

  const mediaOptions: MediaOption[] = (media.docs as AnyDoc[]).map((doc) => ({
    id: asString(doc.id),
    label: mediaLabel(doc),
    url: asString(doc.url) || undefined,
  }));

  const clubOptions: ClubOption[] = (clubs.docs as AnyDoc[]).map((doc) => ({
    id: asString(doc.id),
    name: asString(doc.name),
    slug: asString(doc.slug),
  }));

  const homepageDoc = homepage as AnyDoc;
  const hero = (homepageDoc.hero as AnyDoc | undefined) ?? {};
  const homepageComposer: HomepageComposerData = {
    hero: {
      kicker: asString(hero.kicker),
      headline: asString(hero.headline),
      sublineLead: asString(hero.sublineLead),
      sublineWords: Array.isArray(hero.sublineWords)
        ? (hero.sublineWords as AnyDoc[]).map((item) => asString(item.word)).filter(Boolean)
        : [],
      subParagraph: asString(hero.subParagraph),
      marqueeText: asString(hero.marqueeText),
      ctas: Array.isArray(hero.ctas)
        ? (hero.ctas as AnyDoc[]).map((cta) => ({
            label: asString(cta.label),
            href: asString(cta.href),
            variant: asString(cta.variant) || "primary",
          }))
        : [],
    },
    featuredClubIds: relationIds(homepageDoc.featuredClubs),
    vaultStoryIds: relationIds(homepageDoc.vaultStories),
  };

  return {
    user,
    events: mappedEvents,
    pendingEvents: mappedEvents.filter((event) => event.status === "pending_review"),
    announcements: mappedAnnouncements,
    recaps: mappedRecaps,
    mediaOptions,
    clubs: clubOptions,
    homepage: homepageComposer,
    flagshipId: relationId(homepageDoc.flagshipEvent),
  };
}

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("grid min-w-0 gap-2", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-relaxed text-slate-500">{hint}</span> : null}
    </label>
  );
}

function inputClass(extra?: string) {
  return cn(
    "min-h-11 w-full min-w-0 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-white/45 focus:ring-2 focus:ring-white/10",
    extra,
  );
}

function dateTimeInputClass() {
  return inputClass(
    "font-mono text-[13px] leading-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:invert",
  );
}

function MediaSelect({ name, value, options, required }: { name: string; value?: string; options: MediaOption[]; required?: boolean }) {
  return (
    <select name={name} defaultValue={value || ""} required={required} className={inputClass()}>
      <option value="">Choose from media library</option>
      {options.map((item) => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  );
}

function ClubSelect({ name, value, clubs, required }: { name: string; value?: string; clubs: ClubOption[]; required?: boolean }) {
  return (
    <select name={name} defaultValue={value || ""} required={required} className={inputClass()}>
      <option value="">No club / Council-wide</option>
      {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
    </select>
  );
}

function SlotSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <Field label={label}>
      <select name={name} defaultValue={value || ""} className={inputClass()}>
        <option value="">Empty slot</option>
        {options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </Field>
  );
}

function Panel({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7", className)}>
      {children}
    </section>
  );
}

function PanelTitle({ badge, title, children }: { badge: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <Badge className="border-white/15 bg-white/[0.06] text-slate-100">{badge}</Badge>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      {children ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{children}</p> : null}
    </div>
  );
}

function EventForm({
  event,
  mediaOptions,
  clubs,
  user,
  flagshipId,
}: {
  event?: EventDoc;
  mediaOptions: MediaOption[];
  clubs: ClubOption[];
  user: OpsUser;
  flagshipId?: string;
}) {
  const edit = Boolean(event);
  const admin = isAdmin(user);
  const clubLead = isClubLead(user);
  const availableStatuses = admin ? statuses : nonAdminStatuses;

  return (
    <form action={edit ? updateEventAction : createEventAction} className="grid gap-5">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      {clubLead ? <input type="hidden" name="club" value={user.club || ""} /> : null}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Field label="Event title">
          <input name="title" required maxLength={80} defaultValue={event?.title} placeholder="Ideathon Night" className={inputClass()} />
        </Field>
        <Field label="URL slug">
          <input name="slug" required defaultValue={event?.slug} placeholder="ideathon-night" className={inputClass()} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Status">
          {clubLead ? (
            <>
              <input type="hidden" name="status" value="pending_review" />
              <div className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-slate-100">Submits to admin approval</div>
            </>
          ) : (
            <select name="status" defaultValue={event?.status || "draft"} className={inputClass()}>
              {availableStatuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
            </select>
          )}
        </Field>
        <Field label="Category">
          <select name="category" defaultValue={event?.category || "flagship"} className={inputClass()}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </Field>
        <Field label="Start date/time">
          <input name="date" type="datetime-local" required defaultValue={dateInput(event?.date)} className={dateTimeInputClass()} />
        </Field>
        <Field label="End date/time">
          <input name="endDate" type="datetime-local" defaultValue={dateInput(event?.endDate)} className={dateTimeInputClass()} />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Venue / placement" className="lg:col-span-1" hint="The physical place students will see: auditorium, atrium, LT, sports arena, etc.">
          <input name="venue" required maxLength={120} defaultValue={event?.venue} placeholder="Main Auditorium" className={inputClass()} />
        </Field>
        <Field label="Club owner" className="lg:col-span-1">
          {clubLead ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">{user.clubName || "Club not assigned"}</div>
          ) : (
            <ClubSelect name="club" value={event?.club} clubs={clubs} />
          )}
        </Field>
        <Field label="Banner image" className="lg:col-span-1" hint="Upload in Payload Media first, then choose it here.">
          <MediaSelect name="banner" value={event?.banner} options={mediaOptions} required={!event} />
        </Field>
      </div>

      <Field label="Card excerpt">
        <textarea name="excerpt" required maxLength={240} rows={3} defaultValue={event?.excerpt} placeholder="One short pitch shown on cards and listings." className={inputClass("resize-y")} />
      </Field>
      <Field label="Full event description">
        <textarea name="description" rows={5} defaultValue={event?.description} placeholder="Everything students need to know: what, who, why, schedule, prizes, instructions." className={inputClass("resize-y")} />
      </Field>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Video / Cloudinary link" hint="Optional HTTPS video/page link used by the event page.">
          <input name="videoUrl" type="url" defaultValue={event?.videoUrl} placeholder="https://res.cloudinary.com/..." className={inputClass()} />
        </Field>
        <Field label="Registration link">
          <input name="registrationUrl" type="url" defaultValue={event?.registrationUrl} placeholder="https://forms.gle/..." className={inputClass()} />
        </Field>
        <Field label="Attendees">
          <input name="attendees" type="number" min={0} defaultValue={event?.attendees} placeholder="250" className={inputClass()} />
        </Field>
      </div>

      <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input name="featured" type="checkbox" defaultChecked={event?.featured} className="mt-1 accent-white" />
          <span><strong className="text-white">Feature this event</strong><br /><span className="text-slate-500">Highlights it in event lists.</span></span>
        </label>
        {admin ? (
          <label className="grid gap-2 md:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Legacy homepage flag</span>
            <select name="homepagePlacement" defaultValue={event && flagshipId === event.id ? "flagship" : "none"} className={inputClass()}>
              <option value="none">Do not change</option>
              <option value="flagship">Set as flagship event metadata</option>
            </select>
            <span className="text-xs text-slate-500">Note: the current public homepage does not render a separate flagship-event block yet.</span>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {clubLead ? "Club lead saves always go to Pending review. Admins publish them from the approval queue." : "Saved to Payload and public pages are revalidated."}
        </p>
        <Button type="submit" size="md">{clubLead ? "Submit for approval" : edit ? "Save event changes" : "Create event"}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>
  );
}

function ApprovalQueue({ events }: { events: EventDoc[] }) {
  return (
    <Panel id="approval">
      <PanelTitle badge="Approval queue" title="One-click admin publishing">
        Club leads submit events as pending review. Admins check the details and approve in one click.
      </PanelTitle>
      {events.length === 0 ? (
        <div className="rounded-3xl border border-white/15 bg-white/[0.05] p-5 text-sm text-slate-100">No pending events right now.</div>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <div key={event.id} className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/50 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-white">{event.title}</h3>
                  <Badge className={statusClass(event.status)}>{event.status.replace("_", " ")}</Badge>
                  {event.clubName ? <Badge className="border-white/10 bg-white/5 text-slate-300">{event.clubName}</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-slate-400">{prettyDate(event.date)} · {event.venue}</p>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">{event.excerpt}</p>
              </div>
              <form action={approveEventAction} className="flex gap-2">
                <input type="hidden" name="id" value={event.id} />
                <Button type="submit" size="sm">Approve & publish <BadgeCheck className="h-4 w-4" /></Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function HomepageComposer({
  homepage,
  clubs,
  recaps,
}: {
  homepage: HomepageComposerData;
  clubs: ClubOption[];
  recaps: RecapDoc[];
}) {
  const ctas = [...homepage.hero.ctas, {}, {}, {}, {}].slice(0, 4) as Array<Partial<{ label: string; href: string; variant: string }>>;
  const clubSlots = [...homepage.featuredClubIds, "", "", "", "", "", "", "", ""].slice(0, 8);
  const vaultSlots = [...homepage.vaultStoryIds, "", "", "", "", "", "", "", ""].slice(0, 8);
  const clubOptions = clubs.map((club) => ({ id: club.id, label: club.name }));
  const recapOptions = recaps.map((recap) => ({ id: recap.id, label: `${recap.title}${recap.eventTitle ? ` · ${recap.eventTitle}` : ""}` }));

  return (
    <Panel id="homepage">
      <PanelTitle badge="Homepage composer" title="Edit only real homepage surfaces">
        This controls the visible homepage pieces that are actually rendered now: Hero copy/buttons, Home Vault stories, and Featured Clubs. The unused quick-actions config is intentionally not shown.
      </PanelTitle>
      <form action={updateHomepageComposerAction} className="grid gap-7">
        <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Home className="h-4 w-4 text-slate-200" /> Hero</div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Kicker"><input name="heroKicker" defaultValue={homepage.hero.kicker} className={inputClass()} /></Field>
            <Field label="Main word"><input name="heroHeadline" defaultValue={homepage.hero.headline} className={inputClass()} /></Field>
            <Field label="Subline lead"><input name="heroSublineLead" defaultValue={homepage.hero.sublineLead} className={inputClass()} /></Field>
            <Field label="Cycling words" hint="One per line, or comma-separated."><textarea name="heroSublineWords" rows={4} defaultValue={homepage.hero.sublineWords.join("\n")} className={inputClass("resize-y")} /></Field>
            <Field label="Paragraph" className="lg:col-span-2"><textarea name="heroSubParagraph" rows={3} defaultValue={homepage.hero.subParagraph} className={inputClass("resize-y")} /></Field>
            <Field label="Background marquee" className="lg:col-span-2"><input name="heroMarqueeText" defaultValue={homepage.hero.marqueeText} className={inputClass()} /></Field>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Sparkles className="h-4 w-4 text-slate-200" /> Hero buttons</div>
          <div className="grid gap-4">
            {ctas.map((cta, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 lg:grid-cols-[1fr_1.2fr_0.7fr]">
                <Field label={`Button ${index + 1} label`}><input name={`heroCtaLabel${index + 1}`} defaultValue={cta.label || ""} className={inputClass()} /></Field>
                <Field label="Href"><input name={`heroCtaHref${index + 1}`} defaultValue={cta.href || ""} className={inputClass()} /></Field>
                <Field label="Style"><select name={`heroCtaVariant${index + 1}`} defaultValue={cta.variant || "primary"} className={inputClass()}>{ctaVariants.map((variant) => <option key={variant} value={variant}>{variant}</option>)}</select></Field>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Building2 className="h-4 w-4 text-slate-200" /> Featured clubs order</div>
            <div className="grid gap-3">
              {clubSlots.map((value, index) => <SlotSelect key={index} name={`featuredClub${index + 1}`} label={`Club slot ${index + 1}`} value={value} options={clubOptions} />)}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Clapperboard className="h-4 w-4 text-slate-200" /> Home Vault story order</div>
            <p className="mb-4 text-xs leading-5 text-slate-500">Recaps are post-event stories. On the real site they appear as the rotating Home Vault on the homepage.</p>
            <div className="grid gap-3">
              {vaultSlots.map((value, index) => <SlotSelect key={index} name={`vaultStory${index + 1}`} label={`Vault slot ${index + 1}`} value={value} options={recapOptions} />)}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Save homepage composer <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </form>
    </Panel>
  );
}

function VaultStoryForm({ events, mediaOptions, user }: { events: EventDoc[]; mediaOptions: MediaOption[]; user: OpsUser }) {
  const admin = isAdmin(user);
  return (
    <Panel id="vault">
      <PanelTitle badge="Home Vault" title="Create a recap story">
        A recap is a post-event story: poster/video, short blurb, and optional stats. It powers the homepage Home Vault carousel. The Events page recap block is currently hardcoded, so this dashboard does not pretend to edit that block.
      </PanelTitle>
      <form action={createRecapAction} className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Story title"><input name="title" required maxLength={100} placeholder="Vox Pop Recap" className={inputClass()} /></Field>
          <Field label="Slug"><input name="slug" required placeholder="vox-pop-recap" className={inputClass()} /></Field>
        </div>
        <Field label="Event"><select name="event" required className={inputClass()}><option value="">Choose event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Kicker"><input name="kicker" maxLength={60} placeholder="FLAGSHIP · CULTURAL" className={inputClass()} /></Field>
          <Field label="Published at"><input name="publishedAt" type="datetime-local" defaultValue={dateInput(new Date().toISOString())} className={dateTimeInputClass()} /></Field>
        </div>
        <Field label="Blurb"><textarea name="blurb" maxLength={280} rows={3} placeholder="Short story summary for the Home Vault." className={inputClass("resize-y")} /></Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Hero poster"><MediaSelect name="heroMedia" options={mediaOptions} required /></Field>
          <Field label="Hero video link"><input name="heroVideoUrl" type="url" placeholder="https://res.cloudinary.com/.../video.mp4" className={inputClass()} /></Field>
        </div>
        {admin ? (
          <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
            <input name="pinToVault" type="checkbox" className="mt-1 accent-white" />
            <span><strong className="text-white">Pin to homepage Home Vault</strong><br /><span className="text-slate-500">Admins can pin this story into the visible homepage carousel.</span></span>
          </label>
        ) : null}
        <Button type="submit">Create Vault story <UploadCloud className="h-4 w-4" /></Button>
      </form>
    </Panel>
  );
}

function AnnouncementsPanel({ announcements }: { announcements: AnnouncementDoc[] }) {
  return (
    <Panel id="announcements">
      <PanelTitle badge="Ticker" title="Announcements ticker">
        These are the live scrolling headlines. Pinned items appear first.
      </PanelTitle>
      <form action={createAnnouncementAction} className="mb-5 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/45 p-4">
        <Field label="New headline"><input name="title" required maxLength={140} placeholder="Applications for club fair are open" className={inputClass()} /></Field>
        <Field label="Click-through"><input name="href" placeholder="/events or https://..." className={inputClass()} /></Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Date"><input name="date" type="datetime-local" defaultValue={dateInput(new Date().toISOString())} className={dateTimeInputClass()} /></Field>
          <label className="flex items-center gap-2 self-end rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"><input name="pinned" type="checkbox" className="accent-white" /> Pin</label>
        </div>
        <Button type="submit" size="sm">Add ticker item</Button>
      </form>

      <div className="grid gap-3">
        {announcements.map((item) => (
          <form key={item.id} action={updateAnnouncementAction} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/45 p-4">
            <input type="hidden" name="id" value={item.id} />
            <Field label="Headline"><input name="title" required maxLength={140} defaultValue={item.title} className={inputClass()} /></Field>
            <Field label="Link"><input name="href" defaultValue={item.href} placeholder="/events or https://..." className={inputClass()} /></Field>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Date"><input name="date" type="datetime-local" defaultValue={dateInput(item.date)} className={dateTimeInputClass()} /></Field>
              <label className="flex items-center gap-2 self-end rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"><input name="pinned" type="checkbox" defaultChecked={item.pinned} className="accent-white" /> Pin</label>
            </div>
            <Button type="submit" variant="outline" size="sm">Save announcement</Button>
          </form>
        ))}
      </div>
    </Panel>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const [{ saved }, data] = await Promise.all([searchParams, getOpsData()]);
  const admin = isAdmin(data.user);
  const clubLead = isClubLead(data.user);
  const published = data.events.filter((event) => event.status === "published").length;
  const drafts = data.events.filter((event) => event.status === "draft").length;
  const pending = data.pendingEvents.length;
  const editableEvents = data.events.slice(0, 16);

  return (
    <main className="min-h-screen bg-bg text-ink">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34rem),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.045),transparent_30rem)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[18rem_1fr]">
        <aside className="border-b border-white/10 bg-bg/85 p-5 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-bg"><LayoutDashboard className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-semibold text-white">Council Ops</span>
              <span className="block text-xs text-slate-500">separate dashboard</span>
            </span>
          </Link>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-slate-200" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{data.user.name || data.user.email}</p>
                <p className="text-xs text-slate-500">{roleLabel(data.user.role)}</p>
              </div>
            </div>
            {clubLead ? (
              <div className="mt-3 rounded-2xl border border-white/15 bg-white/[0.06] p-3 text-xs text-slate-100">
                Club mode: {data.user.clubName || "no club assigned"}
              </div>
            ) : null}
          </div>

          <nav className="mt-6 grid gap-2 text-sm text-slate-400">
            {admin ? <a href="#approval" className="rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white">Approval queue</a> : null}
            <a href="#events" className="rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white">Events</a>
            {admin ? <a href="#homepage" className="rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white">Homepage composer</a> : null}
            <a href="#vault" className="rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white">Home Vault stories</a>
            {!clubLead ? <a href="#announcements" className="rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white">Announcements</a> : null}
          </nav>

          <div className="mt-6 grid gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/admin">Full Payload admin <ExternalLink className="h-4 w-4" /></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/">View website</Link></Button>
          </div>
        </aside>

        <div className="p-4 sm:p-6 lg:p-8">
          <section className="mb-7 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <Badge className="border-white/15 bg-white/[0.06] text-slate-100"><LockKeyhole className="mr-1 h-3.5 w-3.5" /> Payload-authenticated</Badge>
                <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">Operations dashboard, not the public website.</h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                  Only signed-in Payload users with an operations role can enter. Admins see approvals, homepage composition, announcements, and every event. Club leads only see their assigned club events, recaps, and pending work.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4 text-slate-200" /> Role rules active</div>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Club lead submissions are locked to Pending review. Publishing is admin-only.</p>
              </div>
            </div>
          </section>

          {saved ? (
            <div className="mb-7 flex items-center gap-3 rounded-3xl border border-white/15 bg-white/[0.06] p-4 text-sm text-slate-100">
              <CheckCircle2 className="h-5 w-5" /> Saved successfully. Public pages were revalidated.
            </div>
          ) : null}

          <section className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: CalendarClock, label: clubLead ? "Your club events" : "Events loaded", value: data.events.length, detail: `${published} published · ${pending} pending · ${drafts} drafts` },
              { icon: ListChecks, label: "Approval queue", value: pending, detail: admin ? "Admin one-click publishing" : "Your waiting submissions" },
              { icon: Clapperboard, label: "Home Vault stories", value: data.recaps.length, detail: "Post-event recaps visible in Home Vault" },
              { icon: Megaphone, label: "Ticker items", value: clubLead ? "Staff only" : data.announcements.length, detail: clubLead ? "Hidden in club lead mode" : "Live homepage/event ticker" },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur">
                <item.icon className="mb-5 h-5 w-5 text-slate-200" />
                <div className="text-2xl font-semibold text-white">{item.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                <p className="mt-3 text-sm text-slate-400">{item.detail}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-7">
            {admin ? <ApprovalQueue events={data.pendingEvents} /> : null}

            <Panel id="events">
              <PanelTitle badge={clubLead ? "Club lead mode" : "Events"} title={clubLead ? "Submit club events for approval" : "Create and edit events"}>
                {clubLead
                  ? "You only see events attached to your assigned club. New saves become pending review for admins."
                  : "Edit real Payload events: venue, homepage metadata, visibility, registration, media, status, and video links."}
              </PanelTitle>
              {clubLead && !data.user.club ? (
                <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-5 text-sm text-slate-100">Your account has the club lead role but is not assigned to a club in Payload Users yet. Ask an admin to set the Club field on your user.</div>
              ) : (
                <div className="grid gap-7">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Send className="h-4 w-4 text-slate-200" /> New event</div>
                    <EventForm mediaOptions={data.mediaOptions} clubs={data.clubs} user={data.user} flagshipId={data.flagshipId} />
                  </div>
                  <div className="grid gap-3">
                    {editableEvents.map((event) => (
                      <details key={event.id} className="group rounded-3xl border border-white/10 bg-slate-950/45 p-4 open:bg-slate-950/70">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-white">{event.title}</span>
                              <Badge className={statusClass(event.status)}>{event.status.replace("_", " ")}</Badge>
                              {event.clubName ? <Badge className="border-white/10 bg-white/5 text-slate-300">{event.clubName}</Badge> : null}
                              {event.featured ? <Badge className="border-white/15 bg-white/[0.06] text-slate-100">Featured</Badge> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{prettyDate(event.date)} · {event.venue}</p>
                          </div>
                          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 group-open:hidden"><PencilLine className="h-4 w-4" /> Edit</span>
                        </summary>
                        <div className="mt-6 border-t border-white/10 pt-6">
                          <EventForm event={event} mediaOptions={data.mediaOptions} clubs={data.clubs} user={data.user} flagshipId={data.flagshipId} />
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            {admin ? <HomepageComposer homepage={data.homepage} clubs={data.clubs} recaps={data.recaps} /> : null}

            <VaultStoryForm events={data.events} mediaOptions={data.mediaOptions} user={data.user} />

            {!clubLead ? <AnnouncementsPanel announcements={data.announcements} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
