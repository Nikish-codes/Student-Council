import { notFound } from "next/navigation";
import { asc, eq, isNull, and, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { councilGroups as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { EditorShell } from "@/components/management/page-header";
import {
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  SaveBar,
} from "@/components/management/fields";
import { saveCouncilGroup } from "../actions";

export default async function CouncilGroupEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const numericId = isNew ? null : Number(id);

  const [row, parents] = await Promise.all([
    isNew
      ? null
      : db.query.councilGroups.findFirst({ where: eq(t.id, Number(id)) }),
    // Only top-level groups can be parents (nesting is one level deep), and a
    // group can't parent itself.
    db
      .select({ id: t.id, title: t.title })
      .from(t)
      .where(
        numericId == null
          ? isNull(t.parentId)
          : and(isNull(t.parentId), ne(t.id, numericId)),
      )
      .orderBy(asc(t.sortOrder)),
  ]);

  if (!isNew && !row) notFound();
  const action = saveCouncilGroup.bind(null, numericId);

  return (
    <EditorShell
      kicker={isNew ? "New section" : "Edit section"}
      title={row?.title ?? "Council section"}
      action={action}
    >
      <TextField
        name="title"
        label="Heading"
        hint='e.g. "The Board", "Core Team", "SCFC"'
        required
        maxLength={80}
        defaultValue={row?.title}
      />
      <TextAreaField
        name="blurb"
        label="Intro line"
        hint="optional · shown under the heading"
        maxLength={300}
        rows={2}
        defaultValue={row?.blurb}
      />
      <SelectField
        name="parentId"
        label="Nest under"
        hint="Leave as a top-level section, or nest it inside another"
        defaultValue={row?.parentId != null ? String(row.parentId) : ""}
        options={[
          { value: "", label: "— Top-level section —" },
          ...parents.map((p) => ({ value: String(p.id), label: p.title })),
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          name="layout"
          label="Layout"
          defaultValue={row?.layout ?? "grid"}
          options={[
            { value: "grid", label: "Grid — wraps onto rows" },
            { value: "hscroll", label: "Scrolling row — one line" },
          ]}
        />
        <NumberField
          name="perRow"
          label="Cards per row"
          hint="1–6 · grid only"
          min={1}
          max={6}
          defaultValue={row?.perRow ?? 4}
        />
        <SelectField
          name="cardSize"
          label="Card size"
          defaultValue={row?.cardSize ?? "md"}
          options={[
            { value: "lg", label: "Large" },
            { value: "md", label: "Medium" },
            { value: "sm", label: "Small" },
          ]}
        />
      </div>
      <NumberField
        name="sortOrder"
        label="Order"
        hint="Lower shows first. Reorder quickly from the list page."
        min={0}
        defaultValue={row?.sortOrder ?? 99}
      />
      <SaveBar />
    </EditorShell>
  );
}
