import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsPeople as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import {
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  MediaField,
  SaveBar,
} from "@/components/management/fields";
import {
  SPORT_TYPE_OPTIONS,
} from "@/lib/sports-options";
import { savePerson } from "../actions";

export default async function PersonEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";

  const [row, media] = await Promise.all([
    isNew ? null : db.query.sportsPeople.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
  ]);
  if (!isNew && !row) notFound();
  const action = savePerson.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell
      kicker={isNew ? "New person" : "Edit person"}
      title={row?.name ?? "New person"}
      action={action}
    >
      <Fieldset title="Identity" hint="Sports alumni or representative.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="name" label="Name" required defaultValue={row?.name} />
          <TextField name="slug" label="Slug" hint="auto if blank" defaultValue={row?.slug} placeholder="auto from name" />
        </div>
        <MediaField name="photoId" label="Photo" hint="portrait · 1:1 or 4:5" defaultValue={row?.photoId ?? null} media={media} />
        <SelectField
          name="role"
          label="Role"
          hint="alumni shows on the alumni section · representative shows in reps"
          defaultValue={row?.role ?? "representative"}
          options={[
            { value: "representative", label: "Representative" },
            { value: "alumni", label: "Alumni" },
          ]}
        />
      </Fieldset>

      <Fieldset title="Details" hint="Optional — show what you fill in.">
        <TextAreaField name="bio" label="Bio" hint="short paragraph" rows={4} defaultValue={row?.bio} />
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField name="graduationYear" label="Graduation year" hint="optional" min={2000} max={2100} defaultValue={row?.graduationYear ?? null} />
          <SelectField
            name="sport"
            label="Sport"
            hint="optional"
            defaultValue={row?.sport ?? ""}
            options={[{ value: "", label: "— none —" }, ...SPORT_TYPE_OPTIONS]}
          />
          <NumberField name="sortOrder" label="Sort order" hint="lower = higher" min={0} max={999} defaultValue={row?.sortOrder ?? 99} />
        </div>
      </Fieldset>

      <Fieldset title="Contact" hint="Optional contact info.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="email" label="Email" defaultValue={row?.email} />
          <TextField name="phone" label="Phone" defaultValue={row?.phone} />
        </div>
      </Fieldset>

      <SaveBar />
    </EditorShell>
  );
}
