import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as clubsT, sportsTeams as t } from "@/db/schema";
import { requireSportsManager } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import {
  TextField,
  SelectField,
  MediaField,
  SaveBar,
} from "@/components/management/fields";
import { saveTeam } from "../actions";

export default async function TeamEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSportsManager();
  const { id } = await params;
  const isNew = id === "new";

  const [row, media, clubList] = await Promise.all([
    isNew
      ? null
      : db.query.sportsTeams.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
    db
      .select({ id: clubsT.id, name: clubsT.name })
      .from(clubsT)
      .orderBy(asc(clubsT.name)),
  ]);
  if (!isNew && !row) notFound();
  const action = saveTeam.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell
      kicker={isNew ? "New team" : "Edit team"}
      title={row?.name ?? "New team"}
      action={action}
    >
      <Fieldset title="Identity" hint="Name, logo, and optional club link.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="name"
            label="Name"
            required
            defaultValue={row?.name}
          />
          <TextField
            name="slug"
            label="Slug"
            hint="auto if blank"
            defaultValue={row?.slug}
            placeholder="auto from name"
          />
        </div>
        <MediaField
          name="logoId"
          label="Logo"
          hint="square · team crest"
          defaultValue={row?.logoId ?? null}
          media={media}
        />
        <SelectField
          name="clubId"
          label="Linked club"
          hint="optional · link this team to a sports club"
          defaultValue={row?.clubId ? String(row.clubId) : ""}
          options={[
            { value: "", label: "— standalone team —" },
            ...clubList.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
      </Fieldset>
      <SaveBar />
    </EditorShell>
  );
}
