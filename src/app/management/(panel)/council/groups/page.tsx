import Link from "next/link";
import { asc } from "drizzle-orm";
import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  MoveHorizontal,
} from "lucide-react";
import { db } from "@/db/client";
import { councilGroups as t, councilMembers as m } from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteCouncilGroup, moveCouncilGroup } from "./actions";

export default async function CouncilGroupsPage() {
  const user = await requireOps();
  const admin = isAdmin(user.role);

  const [groups, members] = await Promise.all([
    db.select().from(t).orderBy(asc(t.sortOrder), asc(t.id)),
    db.select({ id: m.id, groupId: m.groupId }).from(m),
  ]);

  const counts = new Map<number, number>();
  for (const row of members) {
    if (row.groupId == null) continue;
    counts.set(row.groupId, (counts.get(row.groupId) ?? 0) + 1);
  }

  // Render parents in order, each followed by its own children.
  const tops = groups.filter((g) => g.parentId == null);
  const ordered = tops.flatMap((top) => [
    { g: top, depth: 0 },
    ...groups
      .filter((c) => c.parentId === top.id)
      .map((c) => ({ g: c, depth: 1 })),
  ]);

  return (
    <div>
      <PageHeader
        kicker="Council sections"
        title={`${tops.length} on the page`}
        newHref="/management/council/groups/new"
        newLabel="New section"
      />

      <p className="mb-6 max-w-2xl text-sm text-muted">
        Sections are the headings on <span className="text-ink">/council</span>,
        top to bottom. A section with a parent is nested under it — that&rsquo;s
        how The Board shows large VP cards and then smaller officer cards under
        one heading. Deleting a section never deletes its people; they stay
        saved but leave the public Council page until reassigned.
      </p>

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line/10 text-left text-[11px] uppercase tracking-wider text-subtle">
              <th className="px-4 py-2 font-normal">Section</th>
              <th className="px-4 py-2 font-normal">Layout</th>
              <th className="px-4 py-2 font-normal">Per row</th>
              <th className="px-4 py-2 font-normal">Cards</th>
              <th className="px-4 py-2 font-normal">People</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {ordered.map(({ g, depth }) => (
              <tr
                key={g.id}
                className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]"
              >
                <td className="px-4 py-3">
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: depth * 20 }}
                  >
                    {depth > 0 && (
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-subtle" />
                    )}
                    <Link
                      href={`/management/council/groups/${g.id}`}
                      className="font-medium hover:underline"
                    >
                      {g.title}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">
                  {g.layout === "hscroll" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MoveHorizontal className="h-3.5 w-3.5" /> scrolling row
                    </span>
                  ) : (
                    "grid"
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-muted">
                  {g.layout === "hscroll" ? "—" : g.perRow}
                </td>
                <td className="px-4 py-3 font-mono uppercase text-muted">
                  {g.cardSize}
                </td>
                <td className="px-4 py-3 font-mono text-muted">
                  {counts.get(g.id) ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <MoveButton id={g.id} dir="up" />
                    <MoveButton id={g.id} dir="down" />
                    {admin ? (
                      <DeleteButton
                        action={deleteCouncilGroup.bind(null, g.id)}
                        confirmText={`Delete "${g.title}"? Its people remain saved but leave the public Council page until reassigned.`}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {ordered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-subtle">
                  No sections yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoveButton({ id, dir }: { id: number; dir: "up" | "down" }) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  return (
    <form action={moveCouncilGroup.bind(null, id, dir)}>
      <button
        type="submit"
        aria-label={`Move ${dir}`}
        className="grid h-7 w-7 place-items-center rounded-full text-subtle transition-colors hover:bg-line/5 hover:text-ink"
      >
        <Icon className="h-4 w-4" />
      </button>
    </form>
  );
}
