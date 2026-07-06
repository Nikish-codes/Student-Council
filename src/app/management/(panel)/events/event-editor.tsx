"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { DbEvent } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { MediaField, type MediaOption } from "@/components/management/fields";
import { DeleteEventButton } from "./delete-button";

type Option = { id: number; name?: string | null; filename?: string | null; url?: string };

const CATEGORIES = ["tech", "cultural", "sports", "flagship", "academic"] as const;

function field(label: string, hint?: string) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <span className="kicker text-subtle">{label}</span>
      {hint ? <span className="text-[11px] text-subtle">{hint}</span> : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-line/40";

function SaveBar({
  canPublish,
  deleteFor,
}: {
  canPublish: boolean;
  deleteFor?: { id: number; title: string };
}) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line/10 bg-bg/80 py-4 backdrop-blur-xl">
      {deleteFor ? (
        <div className="mr-auto">
          <DeleteEventButton
            id={deleteFor.id}
            title={deleteFor.title}
            redirectTo="/management/events"
            variant="full"
          />
        </div>
      ) : null}
      <Button asChild variant="ghost" size="sm" type="button">
        <Link href="/management/events">Cancel</Link>
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : canPublish ? "Save" : "Save / submit for review"}
      </Button>
    </div>
  );
}

export function EventEditor({
  action,
  event,
  clubs,
  media,
  canPublish,
  isClubLead,
  canDelete = false,
}: {
  action: (fd: FormData) => Promise<void>;
  event: DbEvent | null;
  clubs: Option[];
  media: Option[];
  canPublish: boolean;
  isClubLead: boolean;
  canDelete?: boolean;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");

  // Format an ISO timestamp for a `datetime-local` input using the BROWSER's
  // local components — `toISOString().slice(0,16)` would silently shift by the
  // admin's UTC offset on every round-trip.
  const toLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return (
    <form action={action} className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="kicker text-subtle">{event ? "Edit event" : "New event"}</p>
        <h1 className="display mt-1 text-3xl">{title || "Untitled event"}</h1>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          {field("Title")}
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {field("Slug", "auto-generated if blank")}
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto from title"
              className={inputCls}
            />
          </div>
          <div>
            {field("Category")}
            <select name="category" defaultValue={event?.category ?? "tech"} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {field("Start date & time")}
            <input
              type="datetime-local"
              name="date"
              required
              defaultValue={toLocal(event?.date)}
              className={inputCls}
            />
          </div>
          <div>
            {field("End date & time", "optional")}
            <input
              type="datetime-local"
              name="endDate"
              defaultValue={toLocal(event?.endDate)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          {field("Venue")}
          <input name="venue" required defaultValue={event?.venue ?? ""} className={inputCls} />
        </div>

        <div>
          {field("Excerpt", "shown on listings · max ~240 chars")}
          <textarea
            name="excerpt"
            required
            maxLength={240}
            rows={2}
            defaultValue={event?.excerpt ?? ""}
            className={inputCls}
          />
        </div>

        <div>
          {field("Description", "markdown")}
          <textarea
            name="description"
            rows={6}
            defaultValue={event?.description ?? ""}
            className={inputCls}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <MediaField
            name="bannerId"
            label="Banner image"
            hint="upload or pick"
            defaultValue={event?.bannerId ?? null}
            media={media as MediaOption[]}
          />
          <div>
            {field("Hosting club", "optional")}
            <select
              name="clubId"
              defaultValue={event?.clubId ?? ""}
              disabled={isClubLead}
              className={inputCls}
            >
              <option value="">— none —</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {field("Trailer / video URL", "optional")}
            <input name="videoUrl" defaultValue={event?.videoUrl ?? ""} className={inputCls} />
          </div>
          <div>
            {field("External registration URL", "optional")}
            <input
              name="registrationUrl"
              defaultValue={event?.registrationUrl ?? ""}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {field("Status")}
            <select name="status" defaultValue={event?.status ?? "draft"} className={inputCls}>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending review</option>
              {canPublish ? <option value="published">Published</option> : null}
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            {field("Headcount", "past events · optional")}
            <input
              type="number"
              name="attendees"
              min={0}
              defaultValue={event?.attendees ?? ""}
              className={inputCls}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-muted">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={event?.featured ?? false}
            className="h-4 w-4 rounded border-line/30 bg-surface-2"
          />
          Feature on the homepage
        </label>

        {/* Registration & tickets */}
        <div className="rounded-2xl border border-line/10 p-5">
          <div className="flex items-center justify-between">
            <p className="kicker text-subtle">Registration & tickets</p>
            {event ? (
              <Link
                href={`/management/events/${event.id}/registrations`}
                className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                View registrations →
              </Link>
            ) : null}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              name="registrationEnabled"
              defaultChecked={event?.registrationEnabled ?? false}
              className="h-4 w-4 rounded border-line/30 bg-surface-2"
            />
            Enable native registration on the event page
          </label>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              {field("Price (₹)", "0 = free")}
              <input
                type="number"
                name="priceRupees"
                min={0}
                step="1"
                defaultValue={event?.priceInPaise ? event.priceInPaise / 100 : ""}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              {field("Capacity", "blank = unlimited")}
              <input
                type="number"
                name="capacity"
                min={1}
                defaultValue={event?.capacity ?? ""}
                className={inputCls}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-subtle">
            Paid events require Razorpay keys in the environment. Free events issue
            a ticket instantly.
          </p>
        </div>
      </div>

      <SaveBar
        canPublish={canPublish}
        deleteFor={
          canDelete && event ? { id: event.id, title: event.title } : undefined
        }
      />
    </form>
  );
}
