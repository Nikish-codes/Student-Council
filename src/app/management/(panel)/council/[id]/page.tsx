import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { councilGroups as g, councilMembers as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell } from "@/components/management/page-header";
import { TextField, TextAreaField, NumberField, CheckboxField, MediaField, SelectField, SaveBar } from "@/components/management/fields";
import { saveCouncil } from "../actions";

export default async function CouncilEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const [row, media, groups] = await Promise.all([
    isNew ? null : db.query.councilMembers.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
    db.select({ id: g.id, title: g.title, parentId: g.parentId }).from(g).orderBy(asc(g.sortOrder), asc(g.id)),
  ]);
  if (!isNew && !row) notFound();
  const action = saveCouncil.bind(null, isNew ? null : Number(id));

  // Indent sub-sections so the dropdown mirrors the page's nesting.
  const byId = new Map(groups.map((x) => [x.id, x]));
  const groupOptions = groups.map((x) => ({
    value: String(x.id),
    label:
      x.parentId != null
        ? `   ${byId.get(x.parentId)?.title ?? "?"} → ${x.title}`
        : x.title,
  }));

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
      <TextAreaField name="quote" label="Their line" hint="optional · shown under their photo on the card · no length cap" maxLength={1200} rows={3} defaultValue={row?.quote} />
      <TextAreaField name="bio" label="About / what they do" hint="optional · shown when someone expands their card" maxLength={1200} rows={5} defaultValue={row?.bio} />
      <TextAreaField name="message" label="Long message" hint="optional · President hero only" maxLength={1200} rows={4} defaultValue={row?.message} />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          name="memberType"
          label="Type"
          hint="Co-leads show inside their lead's expanded card"
          defaultValue={row?.memberType ?? "member"}
          options={[
            { value: "member", label: "Member — card in the grid" },
            { value: "president", label: "President — full takeover" },
            { value: "co_lead", label: "Co-lead — under their lead" },
          ]}
        />
        <NumberField name="sortOrder" label="Order" hint="1 = first" min={0} defaultValue={row?.sortOrder ?? 99} />
        <CheckboxField name="featured" label="Featured" defaultChecked={row?.featured ?? false} />
      </div>
      <SelectField
        name="groupId"
        label="Section"
        hint="Which part of /council they appear in · the President and co-leads ignore this"
        defaultValue={row?.groupId != null ? String(row.groupId) : ""}
        options={[
          { value: "", label: "— Ungrouped —" },
          ...groupOptions,
        ]}
      />
      <SaveBar />
    </EditorShell>
  );
}
