import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { councilMembers as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell } from "@/components/management/page-header";
import { TextField, TextAreaField, NumberField, CheckboxField, MediaField, SaveBar } from "@/components/management/fields";
import { saveCouncil } from "../actions";

export default async function CouncilEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const [row, media] = await Promise.all([
    isNew ? null : db.query.councilMembers.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
  ]);
  if (!isNew && !row) notFound();
  const action = saveCouncil.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell kicker={isNew ? "New member" : "Edit member"} title={row?.name ?? "Council member"} action={action}>
      <MediaField name="photoId" label="Portrait" hint="1:1 · upload or pick" defaultValue={row?.photoId ?? null} media={media} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Name" required maxLength={80} defaultValue={row?.name} />
        <TextField name="role" label="Role" hint='e.g. "VP — Cultural"' required maxLength={60} defaultValue={row?.role} />
      </div>
      <TextField name="program" label="Program / batch" required maxLength={80} defaultValue={row?.program} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="email" label="Email" hint="optional" defaultValue={row?.email} />
        <TextField name="linkedin" label="LinkedIn URL" hint="optional" defaultValue={row?.linkedin} />
      </div>
      <TextAreaField name="quote" label="Short quote" hint="optional · editorial slab" maxLength={240} rows={2} defaultValue={row?.quote} />
      <TextAreaField name="message" label="Long message" hint="optional · President hero only" maxLength={1200} rows={4} defaultValue={row?.message} />
      <div className="grid gap-5 sm:grid-cols-3">
        <NumberField name="sortOrder" label="Order" hint="1 = first" min={0} defaultValue={row?.sortOrder ?? 99} />
        <CheckboxField name="isPresident" label="President" defaultChecked={row?.isPresident ?? false} />
        <CheckboxField name="featured" label="Featured" defaultChecked={row?.featured ?? false} />
      </div>
      <SaveBar />
    </EditorShell>
  );
}
