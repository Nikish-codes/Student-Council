"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteFaq } from "./actions";

type FaqRow = {
  id: number;
  question: string;
  page: string;
};

export function FaqsTable({ rows, admin }: { rows: FaqRow[]; admin: boolean }) {
  const columns: Column<FaqRow>[] = [
    {
      key: "question",
      label: "Question",
      sortable: true,
      renderCell: (f) => (
        <Link
          href={`/management/faqs/${f.id}`}
          className="font-medium hover:underline"
        >
          {f.question}
        </Link>
      ),
    },
    {
      key: "page",
      label: "Page",
      sortable: true,
      renderCell: (f) => (
        <span className="capitalize text-muted">{f.page}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (f) =>
        admin ? <DeleteButton action={deleteFaq.bind(null, f.id)} /> : null,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search FAQs…"
      emptyState={
        <>
          No FAQs yet.{" "}
          <Link href="/management/faqs/new" className="underline">
            Create one
          </Link>
          .
        </>
      }
    />
  );
}
