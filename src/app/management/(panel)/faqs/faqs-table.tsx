"use client";

import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteFaq, moveFaq } from "./actions";

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
      renderCell: (f) => (
        <div className="flex items-center justify-end gap-1">
          <MoveButton id={f.id} dir="up" />
          <MoveButton id={f.id} dir="down" />
          {admin ? <DeleteButton action={deleteFaq.bind(null, f.id)} /> : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search FAQs…"
      pageSize={50}
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

function MoveButton({
  id,
  dir,
}: {
  id: number;
  dir: "up" | "down";
}) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  return (
    <form action={moveFaq.bind(null, id, dir)}>
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
