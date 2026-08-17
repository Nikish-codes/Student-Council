"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { SPORT_LABEL } from "@/lib/sports-options";
import { deleteMatch } from "./actions";

type MatchRow = {
  id: number;
  teamAName: string;
  teamBName: string;
  sport: string;
  status: string;
  matchDate: string | null;
  scoreA: number | null;
  scoreB: number | null;
};

const STATUS_CLS: Record<string, string> = {
  live: "text-accent",
  scheduled: "text-muted",
  finished: "text-subtle",
  cancelled: "text-subtle",
};

export function MatchesTable({ rows }: { rows: MatchRow[] }) {
  const columns: Column<MatchRow>[] = [
    {
      key: "match",
      label: "Match",
      sortable: true,
      sortValue: (r) => r.teamAName,
      renderCell: (r) => (
        <Link href={`/management/sports/matches/${r.id}`} className="font-medium hover:underline">
          {r.teamAName} vs {r.teamBName}
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
      key: "score",
      label: "Score",
      renderCell: (r) => (
        <span className="font-mono tabular-nums text-ink">
          {r.scoreA ?? "—"} : {r.scoreB ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      renderCell: (r) => (
        <span className={STATUS_CLS[r.status] ?? "text-subtle"}>
          {r.status === "live" && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
          {r.status}
        </span>
      ),
    },
    {
      key: "matchDate",
      label: "Date",
      sortable: true,
      sortValue: (r) => r.matchDate ?? "",
      renderCell: (r) =>
        r.matchDate ? (
          <span className="text-muted">
            {new Date(r.matchDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (r) => <DeleteButton action={deleteMatch.bind(null, r.id)} />,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search matches…"
      emptyState="No matches yet."
    />
  );
}
