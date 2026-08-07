"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteCouncil } from "./actions";

type CouncilRow = {
  id: number;
  name: string;
  role: string;
  memberType: string;
  isOrphan: boolean;
  groupTitle: string;
};

export function CouncilTable({
  rows,
  admin,
}: {
  rows: CouncilRow[];
  admin: boolean;
}) {
  const columns: Column<CouncilRow>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      renderCell: (m) => (
        <div>
          <Link
            href={`/management/council/${m.id}`}
            className="font-medium hover:underline"
          >
            {m.name}
          </Link>
          {m.memberType === "president" ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
              president
            </span>
          ) : null}
          {m.memberType === "co_lead" ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-subtle">
              co-lead
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      renderCell: (m) => <span className="text-muted">{m.role}</span>,
    },
    {
      key: "groupTitle",
      label: "Section",
      sortable: true,
      renderCell: (m) => {
        if (m.memberType === "president")
          return <span className="text-subtle">—</span>;
        if (m.memberType === "co_lead")
          return m.isOrphan ? (
            <span
              className="text-amber-300/70"
              title="No member holds the matching Lead role, so this co-lead appears nowhere on /council."
            >
              no matching lead
            </span>
          ) : (
            <span className="text-subtle">under their lead</span>
          );
        return m.groupTitle ? (
          <span className="text-muted">{m.groupTitle}</span>
        ) : (
          <span className="text-amber-300/70">ungrouped</span>
        );
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (m) =>
        admin ? <DeleteButton action={deleteCouncil.bind(null, m.id)} /> : null,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search members…"
      emptyState={
        <>
          No members yet.{" "}
          <Link href="/management/council/new" className="underline">
            Create one
          </Link>
          .
        </>
      }
    />
  );
}
