"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteClub } from "./actions";

type ClubRow = {
  id: number;
  name: string;
  categoryName: string;
  tags: string[] | null;
  members: number | null;
};

export function ClubsTable({
  rows,
  admin,
}: {
  rows: ClubRow[];
  admin: boolean;
}) {
  const columns: Column<ClubRow>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      renderCell: (c) => (
        <Link
          href={`/management/clubs/${c.id}`}
          className="font-medium hover:underline"
        >
          {c.name}
        </Link>
      ),
    },
    {
      key: "categoryName",
      label: "Category",
      sortable: true,
      renderCell: (c) =>
        c.categoryName ? (
          <span className="text-muted">{c.categoryName}</span>
        ) : (
          <span className="text-amber-300/70">uncategorised</span>
        ),
    },
    {
      key: "tags",
      label: "Tags",
      renderCell: (c) => (
        <span className="text-muted">{(c.tags ?? []).join(", ")}</span>
      ),
    },
    {
      key: "members",
      label: "Members",
      sortable: true,
      renderCell: (c) => <span className="text-muted">{c.members ?? "—"}</span>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (c) =>
        admin ? <DeleteButton action={deleteClub.bind(null, c.id)} /> : null,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search clubs…"
      emptyState="No clubs yet."
    />
  );
}
