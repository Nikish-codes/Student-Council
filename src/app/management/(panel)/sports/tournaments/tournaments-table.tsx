"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { SPORT_LABEL, DIVISION_LABEL } from "@/lib/sports-options";
import { deleteTournament } from "./actions";

type TournamentRow = {
  id: number;
  title: string;
  sport: string;
  division: string;
  year: number;
  status: string;
};

const STATUS_CLS: Record<string, string> = {
  published: "text-lime-300",
  pending_review: "text-amber-200",
  draft: "text-subtle",
  archived: "text-subtle",
};

export function TournamentsTable({ rows }: { rows: TournamentRow[] }) {
  const columns: Column<TournamentRow>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      renderCell: (r) => (
        <Link href={`/management/sports/tournaments/${r.id}`} className="font-medium hover:underline">
          {r.title}
        </Link>
      ),
    },
    {
      key: "sport",
      label: "Sport",
      sortable: true,
      renderCell: (r) => <span className="text-muted">{SPORT_LABEL(r.sport)}</span>,
    },
    {
      key: "division",
      label: "Division",
      renderCell: (r) => <span className="text-muted">{DIVISION_LABEL(r.division)}</span>,
    },
    {
      key: "year",
      label: "Year",
      sortable: true,
      renderCell: (r) => <span className="text-muted tabular-nums">{r.year}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      renderCell: (r) => (
        <span className={STATUS_CLS[r.status] ?? "text-subtle"}>
          {r.status === "pending_review" ? "review" : r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (r) => <DeleteButton action={deleteTournament.bind(null, r.id)} />,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search tournaments…"
      emptyState="No tournaments yet."
    />
  );
}
