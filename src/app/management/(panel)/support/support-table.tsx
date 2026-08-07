"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteSupport } from "./actions";

type SupportRow = {
  id: number;
  name: string;
  purpose: string;
  ownedBy: string | null;
};

export function SupportTable({
  rows,
  admin,
}: {
  rows: SupportRow[];
  admin: boolean;
}) {
  const columns: Column<SupportRow>[] = [
    {
      key: "name",
      label: "Channel",
      sortable: true,
      renderCell: (c) => (
        <div>
          <Link
            href={`/management/support/${c.id}`}
            className="font-medium hover:underline"
          >
            {c.name}
          </Link>
          <span className="ml-2 text-xs text-subtle">{c.purpose}</span>
        </div>
      ),
    },
    {
      key: "ownedBy",
      label: "Owned by",
      sortable: true,
      renderCell: (c) => (
        <span className="text-muted">{c.ownedBy ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (c) =>
        admin ? <DeleteButton action={deleteSupport.bind(null, c.id)} /> : null,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search channels…"
      emptyState={
        <>
          None yet.{" "}
          <Link href="/management/support/new" className="underline">
            Create one
          </Link>
          .
        </>
      }
    />
  );
}
