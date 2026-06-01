import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { supportChannels as t } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { EditorShell } from "@/components/management/page-header";
import { TextField, TextAreaField, SelectField, TagsField, SaveBar } from "@/components/management/fields";
import { saveSupport } from "../actions";

const ICONS = [
  "ShieldAlert", "MessagesSquare", "Users", "HeartHandshake", "LifeBuoy", "Mail",
  "Phone", "BookOpen", "Megaphone", "GraduationCap", "Compass", "FileText", "Lock",
  "AlertCircle", "HelpCircle", "Headphones", "Stethoscope", "Heart", "Brain", "Calendar",
];

export default async function SupportEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : await db.query.supportChannels.findFirst({ where: eq(t.id, Number(id)) });
  if (!isNew && !row) notFound();
  const action = saveSupport.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell kicker={isNew ? "New channel" : "Edit channel"} title={row?.name ?? "Support channel"} action={action}>
      <TextField name="name" label="Name" required maxLength={60} defaultValue={row?.name} />
      <TextField name="purpose" label="Purpose" hint="one-line headline" required maxLength={80} defaultValue={row?.purpose} />
      <TextAreaField name="description" label="Description" required maxLength={400} rows={3} defaultValue={row?.description} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField name="icon" label="Icon" defaultValue={row?.icon ?? "LifeBuoy"} options={ICONS.map((i) => ({ value: i, label: i }))} />
        <TextField name="ownedBy" label="Owned by" hint="dept / office" required maxLength={80} defaultValue={row?.ownedBy} />
      </div>
      <TagsField name="bring" label="What to bring" defaultValue={row?.bring} />
      <TextAreaField name="councilRole" label="Council's role" required maxLength={400} rows={3} defaultValue={row?.councilRole} />
      <SaveBar />
    </EditorShell>
  );
}
