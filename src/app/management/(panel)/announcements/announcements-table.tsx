"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteAnnouncement } from "./actions";

type AnnouncementRow = {
  id: number;
  title: string;
  pinned: boolean | null;
  date: string | Date | null;
};

export function AnnouncementsTable({
  rows,
  admin,
}: {
  rows: AnnouncementRow[];
  admin: boolean;
}) {
  const columns: Column<AnnouncementRow>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      renderCell: (a) => (
        <div>
          <Link
            href={`/management/announcements/${a.id}`}
            className="font-medium hover:underline"
          >
            {a.title}
          </Link>
          {a.pinned ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
              pinned
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      sortValue: (a) => (a.date ? new Date(a.date) : new Date(0)),
      renderCell: (a) => (
        <span className="text-muted">
          {a.date ? new Date(a.date).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (a) =>
        admin ? <DeleteButton action={deleteAnnouncement.bind(null, a.id)} /> : null,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search announcements…"
      emptyState={
        <>
          No announcements yet.{" "}
          <Link href="/management/announcements/new" className="underline">
            Create one
          </Link>
          .
        </>
      }
    />
  );
}
