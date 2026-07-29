import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clubCategories as t, clubs as c } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { EditorShell } from "@/components/management/page-header";
import {
  TextField,
  TextAreaField,
  NumberField,
  SaveBar,
} from "@/components/management/fields";
import { Button } from "@/components/ui/button";
import { saveClubCategory, assignClubsToCategory } from "../actions";

export default async function ClubCategoryEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOps();
  const { id } = await params;
  const isNew = id === "new";
  const catId = isNew ? null : Number(id);

  const [row, clubs, cats] = await Promise.all([
    catId == null
      ? null
      : db.query.clubCategories.findFirst({ where: eq(t.id, catId) }),
    db
      .select({ id: c.id, name: c.name, categoryId: c.categoryId })
      .from(c)
      .orderBy(asc(c.name)),
    db.select({ id: t.id, label: t.label }).from(t),
  ]);
  if (!isNew && !row) notFound();

  const catLabel = new Map(cats.map((x) => [x.id, x.label]));

  return (
    <div className="mx-auto max-w-3xl">
      <EditorShell
        kicker={isNew ? "New club category" : "Edit club category"}
        title={row?.label ?? "Category"}
        action={saveClubCategory.bind(null, catId)}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="label"
            label="Label"
            hint="the heading on /clubs"
            required
            maxLength={60}
            defaultValue={row?.label}
            placeholder="Tech & Engineering"
          />
          <TextField
            name="slug"
            label="Slug"
            hint={row ? "changing this breaks old #links" : "auto from label"}
            defaultValue={row?.slug}
            placeholder="auto from label"
          />
        </div>
        <TextAreaField
          name="blurb"
          label="Blurb"
          hint="optional · shown under the heading"
          maxLength={240}
          rows={2}
          defaultValue={row?.blurb}
        />
        <NumberField
          name="sortOrder"
          label="Sort order"
          hint="lower comes first"
          min={0}
          defaultValue={row?.sortOrder ?? 99}
        />
        <SaveBar />
      </EditorShell>

      {/* A second, separate form: HTML forms can't nest, and bulk-filing clubs
          is a different write from editing the category itself. */}
      {catId != null && (
        <form
          action={assignClubsToCategory.bind(null, catId)}
          className="mt-14 border-t border-line/10 pt-8"
        >
          <p className="kicker text-subtle">Clubs in this category</p>
          <p className="mt-2 mb-5 text-sm text-muted">
            Tick every club that belongs here. Unticking moves a club out;
            ticking one that sits in another category moves it across.
          </p>

          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {clubs.map((club) => {
              const mine = club.categoryId === catId;
              const elsewhere =
                club.categoryId != null && !mine
                  ? catLabel.get(club.categoryId)
                  : null;
              return (
                <label
                  key={club.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-line/[0.03]"
                >
                  <input
                    type="checkbox"
                    name="clubIds"
                    value={club.id}
                    defaultChecked={mine}
                    className="h-4 w-4 shrink-0 accent-current"
                  />
                  <span className="truncate text-ink">{club.name}</span>
                  {elsewhere ? (
                    <span className="ml-auto shrink-0 text-[11px] text-subtle">
                      in {elsewhere}
                    </span>
                  ) : null}
                </label>
              );
            })}
            {clubs.length === 0 ? (
              <p className="py-6 text-sm text-subtle">No clubs yet.</p>
            ) : null}
          </div>

          <div className="mt-6">
            <Button type="submit">Save club assignments</Button>
          </div>
        </form>
      )}
    </div>
  );
}
