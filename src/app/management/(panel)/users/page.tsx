import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { users as t, clubs as clubsT } from "@/db/schema";
import { requireRole, isAdmin } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { UnlockButton } from "./unlock-button";
import { deleteUser, unlockUser } from "./actions";

export default async function UsersPage() {
  const me = await requireRole("super_admin", "admin");

  const [rows, clubs] = await Promise.all([
    db.select().from(t).orderBy(asc(t.email)),
    db.select({ id: clubsT.id, name: clubsT.name }).from(clubsT),
  ]);
  const clubName = new Map(clubs.map((c) => [c.id, c.name]));
  const now = Date.now();

  const isSuperAdmin = me.role === "super_admin";

  return (
    <div>
      <PageHeader
        kicker="Users"
        title={`${rows.length} accounts`}
        newHref="/management/users/new"
        newLabel="New user"
      />
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <thead className="bg-line/[0.03] text-left text-[10px] uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-4 py-2">Name & email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Club</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const locked =
                u.lockedUntil && new Date(u.lockedUntil).getTime() > now;
              const isSelf = String(u.id) === me.id;
              // admin can't touch super_admin rows.
              const canManage = isSuperAdmin || u.role !== "super_admin";
              return (
                <tr
                  key={u.id}
                  className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]"
                >
                  <td className="px-4 py-3">
                    {canManage ? (
                      <Link
                        href={`/management/users/${u.id}`}
                        className="font-medium hover:underline"
                      >
                        {u.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{u.name}</span>
                    )}
                    {isSelf ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
                        you
                      </span>
                    ) : null}
                    <div className="text-[11px] text-subtle">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3 text-muted">
                    {u.clubId ? clubName.get(u.clubId) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
                        Locked
                      </span>
                    ) : u.password ? (
                      <span className="text-[11px] text-subtle">Active</span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                        No password
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && locked ? (
                      <UnlockButton action={unlockUser.bind(null, u.id)} />
                    ) : null}
                    {canManage && !isSelf && isAdmin(me.role) ? (
                      <DeleteButton
                        action={deleteUser.bind(null, u.id)}
                        confirmText={`Delete ${u.email}? This cannot be undone.`}
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-subtle" colSpan={5}>
                  No users yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[11px] text-subtle">
        Roles: <strong>Super Admin</strong> has full control. <strong>Admin</strong>{" "}
        manages all content + non-super-admin users. <strong>Council Member</strong>,{" "}
        <strong>Editor</strong> can publish. <strong>Club Lead</strong> can only edit
        their own club&apos;s events. <strong>Viewer</strong> has read-only access.
      </p>
    </div>
  );
}
