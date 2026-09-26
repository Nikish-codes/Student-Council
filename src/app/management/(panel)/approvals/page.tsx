import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { Check, Clock3, GitCompareArrows, MessageSquareText, X } from "lucide-react";

import { db } from "@/db/client";
import { clubs, contentRevisions, events, media, recaps, siteSettings, type RevisionEntityType } from "@/db/schema";
import { requireReviewer } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { actOnRevision, approveAllPending, updateApprovalPolicy } from "./actions";
import { ApproveAllButton, ApproveClubButton } from "./approve-buttons";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; type?: string; revision?: string }>;
}) {
  await requireReviewer();
  const query = await searchParams;
  const entityType = ["club_page", "event", "event_followup"].includes(query.type ?? "")
    ? query.type as RevisionEntityType
    : undefined;
  const clubId = Number(query.club) || undefined;
  const [pending, history, clubRows, mediaRows, settings] = await Promise.all([
    db.query.contentRevisions.findMany({
      where: and(
        eq(contentRevisions.status, "pending_review"),
        entityType ? eq(contentRevisions.entityType, entityType) : undefined,
        clubId ? eq(contentRevisions.clubId, clubId) : undefined,
      ),
      orderBy: asc(contentRevisions.submittedAt),
      with: { club: true, author: true },
    }),
    db.query.contentRevisions.findMany({
      where: and(
        entityType ? eq(contentRevisions.entityType, entityType) : undefined,
        clubId ? eq(contentRevisions.clubId, clubId) : undefined,
      ),
      orderBy: desc(contentRevisions.createdAt),
      limit: 30,
      with: { club: true, author: true, reviewer: true },
    }),
    db.select({ id: clubs.id, name: clubs.name }).from(clubs).orderBy(asc(clubs.name)),
    db.select({ id: media.id, url: media.url, alt: media.alt }).from(media),
    db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) }),
  ]);
  const currentPolicy = settings?.approvalPolicy ?? "auto_cosmetic";
  const selected = query.revision
    ? history.find((revision) => revision.id === query.revision) ?? pending.find((revision) => revision.id === query.revision)
    : pending[0];
  const baseline = selected ? await approvedBaseline(selected.entityType, selected.entityId) : null;
  const mediaMap = new Map(mediaRows.map((item) => [item.id, item]));
  const age = (iso: string | null) => {
    if (!iso) return "Not submitted";
    const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
    return hours < 24 ? `${hours}h old` : `${Math.floor(hours / 24)}d old`;
  };

  // ── Group pending revisions by club ────────────────────────────────────
  const grouped = new Map<number, { name: string; items: typeof pending }>();
  for (const revision of pending) {
    const existing = grouped.get(revision.clubId);
    if (existing) {
      existing.items.push(revision);
    } else {
      grouped.set(revision.clubId, {
        name: revision.club?.name ?? `Club #${revision.clubId}`,
        items: [revision],
      });
    }
  }
  const sortedGroups = [...grouped.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div className="space-y-8">
      <header>
        <p className="kicker text-subtle">Publication control</p>
        <h1 className="display mt-1 text-4xl">Approvals</h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">Compare the submitted snapshot with the currently approved version. Approval is blocked if that public version has moved.</p>
      </header>

      {/* ── Approval Policy Configuration ─────────────────────────────────── */}
      <div className="rounded-2xl border border-line/15 bg-surface-2/40 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">Auto-Approval Settings</span>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                currentPolicy === "auto_cosmetic" ? "bg-emerald-500/15 text-emerald-400" :
                currentPolicy === "auto_all" ? "bg-amber-500/15 text-amber-400" :
                "bg-blue-500/15 text-blue-400"
              )}>
                {currentPolicy === "auto_cosmetic" ? "Smart Auto-Approve Active" :
                 currentPolicy === "auto_all" ? "All Changes Auto-Approved" :
                 "Strict Manual Review"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Configure when edits are published immediately versus held for reviewer sign-off.
            </p>
          </div>
        </div>

        <form action={updateApprovalPolicy} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className={cn(
            "relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all",
            currentPolicy === "auto_cosmetic" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line/15 bg-surface hover:border-line/40"
          )}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Smart Auto-Approve</span>
                <input
                  type="radio"
                  name="policy"
                  value="auto_cosmetic"
                  defaultChecked={currentPolicy === "auto_cosmetic"}
                  className="accent-accent"
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Images, banners, videos, activities, taglines, and links publish immediately. Only sensitive changes (name & members) require admin review.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-emerald-400">Recommended</span>
          </label>

          <label className={cn(
            "relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all",
            currentPolicy === "auto_all" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line/15 bg-surface hover:border-line/40"
          )}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Auto-Approve All</span>
                <input
                  type="radio"
                  name="policy"
                  value="auto_all"
                  defaultChecked={currentPolicy === "auto_all"}
                  className="accent-accent"
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Every club page edit is published immediately with zero queue delay.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-amber-400">Zero queue wait</span>
          </label>

          <label className={cn(
            "relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all",
            currentPolicy === "manual_all" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line/15 bg-surface hover:border-line/40"
          )}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Strict Manual Review</span>
                <input
                  type="radio"
                  name="policy"
                  value="manual_all"
                  defaultChecked={currentPolicy === "manual_all"}
                  className="accent-accent"
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Every single edit enters the review queue. Nothing goes live without manual reviewer sign-off.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-muted">Maximum control</span>
          </label>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-bg transition hover:opacity-90"
            >
              Save approval policy
            </button>
          </div>
        </form>
      </div>

      <form className="flex flex-wrap gap-3 rounded-2xl bg-surface p-4" method="get">
        <select name="club" defaultValue={clubId ?? ""} className="h-10 rounded-xl border border-line/15 bg-surface-2 px-3 text-sm outline-none">
          <option value="">All clubs</option>
          {clubRows.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
        </select>
        <select name="type" defaultValue={entityType ?? ""} className="h-10 rounded-xl border border-line/15 bg-surface-2 px-3 text-sm outline-none">
          <option value="">All content</option>
          <option value="club_page">Club pages</option>
          <option value="event">Events</option>
          <option value="event_followup">Post-event media</option>
        </select>
        <button className="h-10 rounded-xl bg-ink px-4 text-sm font-medium text-bg" type="submit">Apply filters</button>
      </form>

      {/* ── Bulk action toolbar ──────────────────────────────────────────── */}
      {pending.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4">
          <form action={approveAllPending}>
            {clubId ? <input type="hidden" name="clubId" value={clubId} /> : null}
            <ApproveAllButton
              label={clubId
                ? `Approve all from ${clubRows.find((c) => c.id === clubId)?.name ?? "club"} (${pending.length})`
                : `Approve all (${pending.length})`}
            />
          </form>
          {!clubId && sortedGroups.length > 1 ? (
            <p className="text-xs text-subtle">Or use the individual &quot;Approve all&quot; buttons per club below</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Queue</h2><span className="text-sm text-subtle">{pending.length}</span></div>
          <div className="overflow-hidden rounded-2xl bg-surface">
            {sortedGroups.map(([gClubId, group]) => (
              <div key={gClubId} className="border-b border-line/10 last:border-0">
                {/* Club group header */}
                <div className="flex items-center justify-between gap-2 border-b border-line/5 bg-surface-2/60 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-ink/10 px-1 text-[10px] font-bold text-ink">
                      {group.items.length}
                    </span>
                    <span className="truncate text-xs font-semibold text-ink">
                      {group.name}
                    </span>
                  </span>
                  <form action={approveAllPending}>
                    <input type="hidden" name="clubId" value={gClubId} />
                    <ApproveClubButton />
                  </form>
                </div>
                {/* Items under this club */}
                {group.items.map((revision) => (
                  <Link
                    key={revision.id}
                    href={`/management/approvals?${new URLSearchParams({ ...(clubId ? { club: String(clubId) } : {}), ...(entityType ? { type: entityType } : {}), revision: revision.id })}`}
                    className={`block border-b border-line/5 py-3 pl-6 pr-4 last:border-0 ${selected?.id === revision.id ? "bg-line/8" : "hover:bg-line/5"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium capitalize">{revision.entityType.replaceAll("_", " ")}</p>
                      <span className="text-xs text-subtle">{age(revision.submittedAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-subtle">by {revision.author?.name ?? "Unknown"}</p>
                  </Link>
                ))}
              </div>
            ))}
            {!pending.length ? <div className="p-8 text-center"><Check className="mx-auto h-5 w-5 text-emerald-400" /><p className="mt-3 text-sm font-medium">Queue cleared</p></div> : null}
          </div>
        </aside>

        <section>
          {selected && baseline ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-subtle">{selected.club?.name ?? "Club"}</p>
                  <h2 className="mt-1 text-2xl font-semibold capitalize">{selected.entityType.replaceAll("_", " ")}</h2>
                  <p className="mt-1 text-xs text-subtle">Base version {selected.baseVersion} · {age(selected.submittedAt)}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs text-amber-300"><Clock3 className="h-3.5 w-3.5" /> Awaiting review</span>
              </div>
              <RevisionComparison current={baseline} proposed={selected.snapshot} mediaMap={mediaMap} />
              {selected.status === "pending_review" ? (
                <form action={actOnRevision} className="rounded-2xl bg-surface p-5">
                  <input type="hidden" name="revisionId" value={selected.id} />
                  <label className="text-sm font-medium text-muted">Review note<span className="ml-2 text-xs font-normal text-subtle">Required when requesting changes or declining</span>
                    <textarea name="note" rows={3} className="mt-2 w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-line/40" />
                  </label>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button type="submit" name="action" value="decline" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-red-300 hover:bg-red-500/10"><X className="h-4 w-4" /> Decline</button>
                    <button type="submit" name="action" value="request_changes" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line/15 px-4 text-sm font-medium hover:bg-line/5"><MessageSquareText className="h-4 w-4" /> Request changes</button>
                    <button type="submit" name="action" value="approve" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-bg"><Check className="h-4 w-4" /> Approve and publish</button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-2xl bg-surface text-center"><div><GitCompareArrows className="mx-auto h-6 w-6 text-subtle" /><h2 className="mt-4 font-medium">Select a submission</h2><p className="mt-1 text-sm text-muted">Choose an item from the queue to compare versions.</p></div></div>
          )}
        </section>
      </div>

      <section>
        <h2 className="font-semibold">History</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-subtle"><tr><th className="px-4 py-3 font-medium">Club</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Author</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Reviewer</th></tr></thead>
            <tbody>{history.map((revision) => <tr key={revision.id} className="border-t border-line/10"><td className="px-4 py-3">{revision.club?.name ?? "Unknown"}</td><td className="px-4 py-3 capitalize text-muted">{revision.entityType.replaceAll("_", " ")}</td><td className="px-4 py-3 text-muted">{revision.author?.name ?? "Unknown"}</td><td className="px-4 py-3 capitalize">{revision.status.replaceAll("_", " ")}</td><td className="px-4 py-3 text-muted">{revision.reviewer?.name ?? ""}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function approvedBaseline(type: RevisionEntityType, entityId: number): Promise<Record<string, unknown> | null> {
  if (type === "club_page") {
    const row = await db.query.clubs.findFirst({ where: eq(clubs.id, entityId) });
    if (!row) return null;
    return {
      name: row.name, blurb: row.blurb, tagline: row.tagline, about: row.about,
      logoId: row.logoId, coverId: row.coverId, joinUrl: row.joinUrl, members: row.members,
      foundedYear: row.foundedYear, flagshipEvent: row.flagshipEvent, activities: row.activities,
      videos: row.videos, gallery: row.gallery, instagramUrl: row.instagramUrl,
      linkedinUrl: row.linkedinUrl, websiteUrl: row.websiteUrl, contactEmail: row.contactEmail,
      pageTemplate: row.pageTemplate, pageTheme: row.pageTheme,
      pageVisibleSections: row.pageVisibleSections, pageSectionHeadings: row.pageSectionHeadings,
      pageTypography: row.pageTypography,
    };
  }
  if (type === "event") {
    const row = await db.query.events.findFirst({ where: eq(events.id, entityId) });
    if (!row) return null;
    return {
      title: row.title,
      slug: row.slug,
      category: row.category,
      date: row.date,
      endDate: row.endDate,
      venue: row.venue,
      excerpt: row.excerpt,
      description: row.description,
      bannerId: row.bannerId,
      videoUrl: row.videoUrl,
      registrationUrl: row.registrationUrl,
      attendees: row.attendees,
      featured: row.featured,
      clubId: row.clubId,
      registrationEnabled: row.registrationEnabled,
      priceInPaise: row.priceInPaise,
      capacity: row.capacity,
    };
  }
  const row = await db.query.recaps.findFirst({ where: eq(recaps.id, entityId) });
  if (!row) return null;
  return { title: row.title, kicker: row.kicker, blurb: row.blurb, heroMediaId: row.heroMediaId, photoMediaIds: [], videoLinks: row.heroVideoUrl ? [row.heroVideoUrl] : [] };
}

function RevisionComparison({ current, proposed, mediaMap }: { current: Record<string, unknown>; proposed: Record<string, unknown>; mediaMap: Map<number, { id: number; url: string; alt: string }> }) {
  const keys = [...new Set([...Object.keys(current), ...Object.keys(proposed)])];
  const changed = keys.filter((key) => JSON.stringify(current[key] ?? null) !== JSON.stringify(proposed[key] ?? null));
  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="grid grid-cols-[10rem_1fr_1fr] gap-4 border-b border-line/10 px-5 py-3 text-xs font-medium text-subtle"><span>Field</span><span>Approved</span><span>Proposed</span></div>
      {changed.map((key) => (
        <div key={key} className="grid grid-cols-1 gap-3 border-b border-line/10 px-5 py-4 last:border-0 sm:grid-cols-[10rem_1fr_1fr]">
          <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, " $1").replaceAll("_", " ")}</p>
          <CompareValue value={current[key]} field={key} mediaMap={mediaMap} />
          <CompareValue value={proposed[key]} field={key} mediaMap={mediaMap} proposed />
        </div>
      ))}
      {!changed.length ? <p className="px-5 py-10 text-center text-sm text-muted">No field changes detected.</p> : null}
    </div>
  );
}

function CompareValue({ value, field, mediaMap, proposed }: { value: unknown; field: string; mediaMap: Map<number, { id: number; url: string; alt: string }>; proposed?: boolean }) {
  if (field.endsWith("Id") && typeof value === "number" && mediaMap.has(value)) {
    const item = mediaMap.get(value)!;
    // Media may include legacy external URLs that are not supported by the
    // configured Next Image host allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    return <div className={`rounded-xl p-2 ${proposed ? "bg-emerald-500/8" : "bg-surface-2"}`}><img src={item.url} alt={item.alt} className="max-h-36 w-full rounded-lg object-contain" /><p className="mt-2 text-xs text-subtle">Media {value}</p></div>;
  }
  const text = value == null || value === "" ? "Not set" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return <pre className={`max-h-52 overflow-auto whitespace-pre-wrap rounded-xl p-3 font-sans text-xs leading-5 ${proposed ? "bg-emerald-500/8 text-ink" : "bg-surface-2 text-muted"}`}>{text}</pre>;
}
