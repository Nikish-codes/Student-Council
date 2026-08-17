"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteTeam } from "./actions";

type TeamRow = {
  id: number;
  name: string;
  slug: string;
  clubName: string | null;
};

export function TeamsTable({ rows }: { rows: TeamRow[] }) {
  const columns: Column<TeamRow>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      renderCell: (r) => (
        <Link href={`/management/sports/teams/${r.id}`} className="font-medium hover:underline">
          {r.name}
        </Link>
      ),
    },
    {
      key: "clubName",
      label: "Linked club",
      renderCell: (r) =>
        r.clubName ? (
          <span className="text-muted">{r.clubName}</span>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      key: "slug",
      label: "Slug",
      renderCell: (r) => <span className="font-mono text-xs text-subtle">{r.slug}</span>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (r) => <DeleteButton action={deleteTeam.bind(null, r.id)} />,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search teams…"
      emptyState="No teams yet. Create one to start scheduling matches."
    />
  );
}
