"use client";

import Link from "next/link";
import type { EventStatus } from "@/db/schema";
import { DataTable, type Column, type FilterTab } from "@/components/management/data-table";
import { ApprovalButton } from "./approval-button";
import { DeleteEventButton } from "./delete-button";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  pending_review: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  draft: "bg-line/5 text-subtle border-line/15",
  archived: "bg-line/5 text-subtle border-line/15",
};

type EventRow = {
  id: number;
  title: string;
  featured: boolean | null;
  category: string;
  date: string | Date | null;
  status: EventStatus;
  clubName?: string;
};

export function EventsTable({
  rows,
  publisher,
  admin,
}: {
  rows: EventRow[];
  publisher: boolean;
  admin: boolean;
}) {
  const columns: Column<EventRow>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      renderCell: (e) => (
        <div>
          <Link
            href={`/management/events/${e.id}`}
            className="font-medium text-ink hover:underline"
          >
            {e.title}
          </Link>
          {e.featured ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
              ★
            </span>
          ) : null}
          {e.clubName ? (
            <span className="ml-2 text-xs text-subtle">· {e.clubName}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      renderCell: (e) => (
        <span className="capitalize text-muted">{e.category}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      sortValue: (e) => (e.date ? new Date(e.date) : new Date(0)),
      renderCell: (e) => (
        <span className="text-muted">
          {e.date ? new Date(e.date).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      renderCell: (e) => (
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${
            STATUS_STYLES[e.status] ?? STATUS_STYLES.draft
          }`}
        >
          {e.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (e) => (
        <div className="flex items-center justify-end gap-2">
          {publisher && e.status === "pending_review" ? (
            <ApprovalButton id={e.id} />
          ) : null}
          {admin ? <DeleteEventButton id={e.id} title={e.title} /> : null}
        </div>
      ),
    },
  ];

  const tabs: FilterTab<EventRow>[] = [
    { label: "Published", match: (e) => e.status === "published" },
    { label: "Pending", match: (e) => e.status === "pending_review" },
    { label: "Draft", match: (e) => e.status === "draft" },
    { label: "Archived", match: (e) => e.status === "archived" },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      filterTabs={tabs}
      searchPlaceholder="Search events…"
      emptyState={
        <>
          No events yet.{" "}
          <Link href="/management/events/new" className="underline">
            Create one
          </Link>
          .
        </>
      }
    />
  );
}
