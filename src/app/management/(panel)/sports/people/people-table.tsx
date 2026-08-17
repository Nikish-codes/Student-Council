"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deletePerson } from "./actions";

type PersonRow = {
  id: number;
  name: string;
  role: string;
  sport: string | null;
  graduationYear: number | null;
};

export function PeopleTable({ rows }: { rows: PersonRow[] }) {
  const columns: Column<PersonRow>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      renderCell: (r) => (
        <Link href={`/management/sports/people/${r.id}`} className="font-medium hover:underline">
          {r.name}
        </Link>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      renderCell: (r) => (
        <span className={r.role === "alumni" ? "text-sky-300" : "text-amber-200"}>
          {r.role === "alumni" ? "Alumni" : "Representative"}
        </span>
      ),
    },
    {
      key: "sport",
      label: "Sport",
      renderCell: (r) =>
        r.sport ? <span className="text-muted">{r.sport}</span> : <span className="text-subtle">—</span>,
    },
    {
      key: "graduationYear",
      label: "Grad. year",
      sortable: true,
      renderCell: (r) => <span className="text-muted">{r.graduationYear ?? "—"}</span>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (r) => <DeleteButton action={deletePerson.bind(null, r.id)} />,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search people…"
      emptyState="No people yet. Add sports alumni or representatives."
    />
  );
}
