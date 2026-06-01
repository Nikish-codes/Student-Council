import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { highlights as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell } from "@/components/management/page-header";
import { TextField, SelectField, NumberField, MediaField, SaveBar } from "@/components/management/fields";
import { saveHighlight } from "../actions";

export default async function HighlightEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const [row, media] = await Promise.all([
    isNew ? null : db.query.highlights.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
  ]);
  if (!isNew && !row) notFound();
  const action = saveHighlight.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell kicker={isNew ? "New highlight" : "Edit highlight"} title={row?.alt ?? "Highlight"} action={action}>
      <MediaField name="imageId" label="Image" defaultValue={row?.imageId ?? null} media={media} />
      <TextField name="alt" label="Alt text" required maxLength={140} defaultValue={row?.alt} />
      <TextField name="caption" label="Caption" hint="optional" maxLength={140} defaultValue={row?.caption} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="span"
          label="Span"
          defaultValue={row?.span ?? "md"}
          options={[
            { value: "sm", label: "Small (1×1)" },
            { value: "md", label: "Medium (2×1)" },
            { value: "lg", label: "Large (2×2)" },
            { value: "xl", label: "X-Large (3×2)" },
          ]}
        />
        <NumberField name="sortOrder" label="Order" min={0} defaultValue={row?.sortOrder ?? 99} />
      </div>
      <SaveBar />
    </EditorShell>
  );
}
