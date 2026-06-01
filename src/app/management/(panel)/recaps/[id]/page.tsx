import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recaps as t, events as eventsT } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell } from "@/components/management/page-header";
import {
  TextField, TextAreaField, SelectField, DateTimeField, MediaField, RepeaterField, SaveBar,
} from "@/components/management/fields";
import { saveRecap } from "../actions";

export default async function RecapEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const [row, media, events] = await Promise.all([
    isNew ? null : db.query.recaps.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
    db.select({ id: eventsT.id, title: eventsT.title }).from(eventsT).orderBy(asc(eventsT.title)),
  ]);
  if (!isNew && !row) notFound();
  const action = saveRecap.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell kicker={isNew ? "New recap" : "Edit recap"} title={row?.title ?? "Recap"} action={action}>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="title" label="Title" required maxLength={100} defaultValue={row?.title} />
        <TextField name="slug" label="Slug" hint="auto if blank" defaultValue={row?.slug} />
      </div>
      <SelectField
        name="eventId"
        label="Event"
        defaultValue={row?.eventId ? String(row.eventId) : ""}
        options={[{ value: "", label: "— none —" }, ...events.map((e) => ({ value: String(e.id), label: e.title }))]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="kicker" label="Kicker" hint="optional eyebrow" maxLength={60} defaultValue={row?.kicker} />
        <DateTimeField name="publishedAt" label="Published at" defaultValue={row?.publishedAt ?? new Date().toISOString()} />
      </div>
      <TextAreaField name="blurb" label="Blurb" hint="card summary" maxLength={280} rows={2} defaultValue={row?.blurb} />
      <MediaField name="heroMediaId" label="Hero image" hint="poster / fallback" defaultValue={row?.heroMediaId ?? null} media={media} />
      <TextField name="heroVideoUrl" label="Hero video URL" hint="direct .mp4/.webm" defaultValue={row?.heroVideoUrl} />
      <RepeaterField
        name="stats"
        label="Stats"
        hint="headline numbers"
        columns={[{ name: "label", label: "Label" }, { name: "value", label: "Value" }]}
        defaultValue={(row?.stats as { label: string; value: string }[]) ?? []}
        template={{ label: "", value: "" }}
      />
      <RepeaterField
        name="gallery"
        label="Gallery"
        hint="image URL + caption"
        columns={[{ name: "url", label: "Image URL" }, { name: "caption", label: "Caption" }]}
        defaultValue={(row?.gallery as { url: string; caption: string }[]) ?? []}
        template={{ url: "", caption: "" }}
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={row?.status ?? "draft"}
        options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]}
      />
      <SaveBar />
    </EditorShell>
  );
}
