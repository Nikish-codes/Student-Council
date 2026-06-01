import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { EditorShell } from "@/components/management/page-header";
import {
  TextField,
  DateTimeField,
  CheckboxField,
  SaveBar,
} from "@/components/management/fields";
import { saveAnnouncement } from "../actions";

export default async function AnnouncementEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew
    ? null
    : await db.query.announcements.findFirst({ where: eq(t.id, Number(id)) });
  if (!isNew && !row) notFound();

  const action = saveAnnouncement.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell kicker={isNew ? "New announcement" : "Edit announcement"} title={row?.title ?? "Announcement"} action={action}>
      <TextField name="title" label="Title" required maxLength={140} defaultValue={row?.title} />
      <TextField name="href" label="Link" hint="optional · /path or https://…" defaultValue={row?.href} />
      <DateTimeField name="date" label="Date" required defaultValue={row?.date ?? new Date().toISOString()} />
      <CheckboxField name="pinned" label="Pin to the front of the ticker" defaultChecked={row?.pinned ?? false} />
      <SaveBar />
    </EditorShell>
  );
}
