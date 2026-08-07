"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteRecap } from "./actions";

type RecapRow = {
  id: number;
  title: string;
  eventTitle: string;
  status: string;
};

export function RecapsTable({ rows, admin }: { rows: RecapRow[]; admin: boolean }) {
  const columns: Column<RecapRow>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      renderCell: (r) => (
        <div>
          <Link href={`/management/recaps/${r.id}`} className="font-medium hover:underline">
            {r.title}
          </Link>
          {r.eventTitle ? (
            <span className="ml-2 text-xs text-subtle">· {r.eventTitle}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      renderCell: (r) => (
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            r.status === "published"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-line/15 text-subtle"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (r) =>
        admin ? <DeleteButton action={deleteRecap.bind(null, r.id)} /> : null,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search recaps…"
      emptyState={
        <>
          No recaps yet.{" "}
          <Link href="/management/recaps/new" className="underline">
            Create one
          </Link>
          .
        </>
      }
    />
  );
}
