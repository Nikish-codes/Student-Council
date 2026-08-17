import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { users as t, clubs as clubsT } from "@/db/schema";
import { requireRole, isAdmin } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { PageHeader } from "@/components/management/page-header";
import { UsersTable } from "./users-table";

export default async function UsersPage() {
  const me = await requireRole("super_admin", "admin");

  const [rows, clubs] = await Promise.all([
    db.select().from(t).orderBy(asc(t.email)),
    db.select({ id: clubsT.id, name: clubsT.name }).from(clubsT),
  ]);
  const clubName = new Map(clubs.map((c) => [c.id, c.name]));
  const now = Date.now();
  const isSuperAdmin = me.role === "super_admin";
  const admin = isAdmin(me.role);

  const tableRows = rows.map((u) => {
    const locked = !!(u.lockedUntil && new Date(u.lockedUntil).getTime() > now);
    const isSelf = String(u.id) === me.id;
    const canManage = isSuperAdmin || u.role !== "super_admin";
    return {
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? "",
      role: ROLE_LABELS[u.role],
      clubName: u.clubId ? clubName.get(u.clubId) ?? "" : "",
      locked,
      hasPassword: !!u.password,
      isSelf,
      canManage,
    };
  });

  return (
    <div>
      <PageHeader
        kicker="Users"
        title={`${rows.length} accounts`}
        newHref="/management/users/new"
        newLabel="New user"
      />
      <UsersTable rows={tableRows} isAdmin={admin} />
      <p className="mt-4 text-[11px] text-subtle">
        Roles: <strong>Super Admin</strong> has full control. <strong>Admin</strong>{" "}
        manages content and standard users. <strong>Food Committee Member</strong>{" "}
        manages only the Oval menu. <strong>Council Member</strong>,{" "}
        <strong>Editor</strong> can publish. <strong>Club Lead</strong> can only edit
        their own club events. <strong>Viewer</strong> has read-only access.
      </p>
    </div>
  );
}
