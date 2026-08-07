"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/management/data-table";
import { DeleteButton } from "@/components/management/delete-button";
import { UnlockButton } from "./unlock-button";
import { deleteUser, unlockUser } from "./actions";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  clubName: string;
  locked: boolean;
  hasPassword: boolean;
  isSelf: boolean;
  canManage: boolean;
};

export function UsersTable({
  rows,
  isSuperAdmin,
  isAdmin,
}: {
  rows: UserRow[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
}) {
  const columns: Column<UserRow>[] = [
    {
      key: "name",
      label: "Name & email",
      sortable: true,
      renderCell: (u) => (
        <div>
          {u.canManage ? (
            <Link
              href={`/management/users/${u.id}`}
              className="font-medium hover:underline"
            >
              {u.name}
            </Link>
          ) : (
            <span className="font-medium">{u.name}</span>
          )}
          {u.isSelf ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
              you
            </span>
          ) : null}
          <div className="text-[11px] text-subtle">{u.email}</div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      renderCell: (u) => <span className="text-muted">{u.role}</span>,
    },
    {
      key: "clubName",
      label: "Club",
      sortable: true,
      renderCell: (u) => <span className="text-muted">{u.clubName || "—"}</span>,
    },
    {
      key: "locked",
      label: "Status",
      sortable: true,
      renderCell: (u) =>
        u.locked ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
            Locked
          </span>
        ) : u.hasPassword ? (
          <span className="text-[11px] text-subtle">Active</span>
        ) : (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
            No password
          </span>
        ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      renderCell: (u) => (
        <div className="flex items-center justify-end gap-2">
          {u.canManage && u.locked ? (
            <UnlockButton action={unlockUser.bind(null, u.id)} />
          ) : null}
          {u.canManage && !u.isSelf && isAdmin ? (
            <DeleteButton
              action={deleteUser.bind(null, u.id)}
              confirmText={`Delete ${u.email}? This cannot be undone.`}
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchPlaceholder="Search users…"
      emptyState="No users yet."
    />
  );
}
