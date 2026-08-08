import Link from "next/link";
import Image from "next/image";
import { asc } from "drizzle-orm";
import { ChevronUp, ChevronDown } from "lucide-react";
import { db } from "@/db/client";
import { highlights as t } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteHighlight, moveHighlight } from "./actions";

export default async function HighlightsPage() {
  const user = await requireOps();
  const rows = await db.query.highlights.findMany({
    with: { image: true },
    orderBy: asc(t.sortOrder),
  });
  const admin = isAdmin(user.role);
  return (
    <div>
      <PageHeader
        kicker="Homepage highlights"
        title={`${rows.length} total`}
        newHref="/management/highlights/new"
        newLabel="New highlight"
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {rows.map((h, i) => (
          <div key={h.id} className="surface-card overflow-hidden rounded-2xl">
            <Link
              href={`/management/highlights/${h.id}`}
              className="relative block aspect-square bg-line/5"
            >
              {h.image?.url ? (
                <Image
                  src={h.image.url}
                  alt={h.alt}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              ) : null}
            </Link>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-muted">
                {h.span} · #{h.sortOrder}
              </span>
              <div className="flex items-center gap-1">
                <MoveButton id={h.id} dir="up" disabled={i === 0} />
                <MoveButton
                  id={h.id}
                  dir="down"
                  disabled={i === rows.length - 1}
                />
                {admin ? (
                  <DeleteButton action={deleteHighlight.bind(null, h.id)} label="" />
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="col-span-full py-12 text-center text-subtle">
            No highlights yet.{" "}
            <Link href="/management/highlights/new" className="underline">
              Create one
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MoveButton({
  id,
  dir,
  disabled,
}: {
  id: number;
  dir: "up" | "down";
  disabled?: boolean;
}) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  return (
    <form action={moveHighlight.bind(null, id, dir)}>
      <button
        type="submit"
        disabled={disabled}
        aria-label={`Move ${dir}`}
        className="grid h-7 w-7 place-items-center rounded-full text-subtle transition-colors hover:bg-line/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <Icon className="h-4 w-4" />
      </button>
    </form>
  );
}
