"use client";

import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { deleteCouncil, moveCouncilMember } from "./actions";

type CouncilRow = {
  id: number;
  name: string;
  role: string;
  memberType: string;
  isOrphan: boolean;
  groupTitle: string;
};

export function CouncilTable({
  rows,
  admin,
}: {
  rows: CouncilRow[];
  admin: boolean;
}) {
  const columns: Column<CouncilRow>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      renderCell: (m) => (
        <div>
          <Link
            href={`/management/council/${m.id}`}
            className="font-medium hover:underline"
          >
            {m.name}
          </Link>
          {m.memberType === "president" ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
              president
            </span>
          ) : null}
          {m.memberType === "co_lead" ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-subtle">
              co-lead
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      renderCell: (m) => <span className="text-muted">{m.role}</span>,
    },
    {
      key: "groupTitle",
      label: "Section",
      sortable: true,
      renderCell: (m) => {
        if (m.memberType === "president")
          return <span className="text-subtle">—</span>;
        if (m.memberType === "co_lead")
          return m.isOrphan ? (
            <span
              className="text-amber-300/70"
              title="No member holds the matching Lead role, so this co-lead appears nowhere on /council."
            >
              no matching lead
            </span>
          ) : (
            <span className="text-subtle">under their lead</span>
          );
        return m.groupTitle ? (
          <span className="text-muted">{m.groupTitle}</span>
        ) : (
          <span className="text-amber-300/70">ungrouped</span>
        );
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (m) => (
        <div className="flex items-center justify-end gap-1">
          <MoveButton id={m.id} dir="up" />
          <MoveButton id={m.id} dir="down" />
          {admin ? (
            <DeleteButton action={deleteCouncil.bind(null, m.id)} />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search members…"
      pageSize={50}
      emptyState={
        <>
          No members yet.{" "}
          <Link href="/management/council/new" className="underline">
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
    <form action={moveCouncilMember.bind(null, id, dir)}>
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
