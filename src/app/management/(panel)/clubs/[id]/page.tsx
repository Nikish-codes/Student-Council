import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as t, users as usersT } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell } from "@/components/management/page-header";
import { TextField, TextAreaField, NumberField, TagsField, SelectField, MediaField, SaveBar } from "@/components/management/fields";
import { saveClub } from "../actions";

export default async function ClubEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const [row, media, leads] = await Promise.all([
    isNew ? null : db.query.clubs.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
    db.select({ id: usersT.id, name: usersT.name }).from(usersT).orderBy(asc(usersT.name)),
  ]);
  if (!isNew && !row) notFound();
  const action = saveClub.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell kicker={isNew ? "New club" : "Edit club"} title={row?.name ?? "Club"} action={action}>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Name" required maxLength={60} defaultValue={row?.name} />
        <TextField name="slug" label="Slug" hint="auto if blank" defaultValue={row?.slug} placeholder="auto from name" />
      </div>
      <MediaField name="logoId" label="Logo" hint="square · upload or pick" defaultValue={row?.logoId ?? null} media={media} />
      <TextAreaField name="blurb" label="Blurb" required maxLength={200} rows={2} defaultValue={row?.blurb} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="joinUrl" label="Join URL" hint="optional" defaultValue={row?.joinUrl} />
        <NumberField name="members" label="Members" hint="optional" min={0} defaultValue={row?.members ?? null} />
      </div>
      <TagsField name="tags" label="Tags" defaultValue={row?.tags} />
      <SelectField
        name="leadId"
        label="Club lead"
        hint="optional"
        defaultValue={row?.leadId ? String(row.leadId) : ""}
        options={[{ value: "", label: "— none —" }, ...leads.map((l) => ({ value: String(l.id), label: l.name }))]}
      />
      <SaveBar />
    </EditorShell>
  );
}
