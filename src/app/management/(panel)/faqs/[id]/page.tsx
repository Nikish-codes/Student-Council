import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { EditorShell } from "@/components/management/page-header";
import { TextField, TextAreaField, SelectField, NumberField, SaveBar } from "@/components/management/fields";
import { saveFaq } from "../actions";

export default async function FaqEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : await db.query.faqs.findFirst({ where: eq(t.id, Number(id)) });
  if (!isNew && !row) notFound();
  const action = saveFaq.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell kicker={isNew ? "New FAQ" : "Edit FAQ"} title={row?.question ?? "FAQ"} action={action}>
      <TextField name="question" label="Question" required maxLength={200} defaultValue={row?.question} />
      <TextAreaField name="answer" label="Answer" hint="markdown" rows={5} defaultValue={row?.answer} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="page"
          label="Page"
          defaultValue={row?.page ?? "council"}
          options={[
            { value: "council", label: "Council" },
            { value: "support", label: "Support" },
            { value: "clubs", label: "Clubs" },
            { value: "events", label: "Events" },
          ]}
        />
        <NumberField name="sortOrder" label="Order" hint="lower = first" min={0} defaultValue={row?.sortOrder ?? 99} />
      </div>
      <SaveBar />
    </EditorShell>
  );
}
