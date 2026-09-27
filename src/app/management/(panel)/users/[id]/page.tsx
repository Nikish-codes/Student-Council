import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users as t, clubs as clubsT } from "@/db/schema";
import { requireRole, ROLES_ALL } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { EditUserForm } from "../user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const me = await requireRole("super_admin", "admin");

  const [user, clubs] = await Promise.all([
    db.query.users.findFirst({ where: eq(t.id, id) }),
    db
      .select({ id: clubsT.id, name: clubsT.name })
      .from(clubsT)
      .orderBy(asc(clubsT.name)),
  ]);
  if (!user) notFound();

  // Only super admins can edit privileged super-admin/Oval accounts.
  if (
    me.role !== "super_admin" &&
    (user.role === "super_admin" || user.role === "food_committee_member")
  ) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="kicker text-subtle">Users</p>
        <h1 className="display mt-1 text-3xl">Locked</h1>
        <p className="mt-6 text-sm text-muted">
          Only a Super Admin can edit Super Admin or Food Committee accounts.
        </p>
      </div>
    );
  }

  const isSelf = String(user.id) === me.id;

  // What roles is the actor allowed to assign?
  const assignable = (me.role === "super_admin"
    ? ROLES_ALL
    : ROLES_ALL.filter(
        (r) => r !== "super_admin" && r !== "food_committee_member",
      )
  ).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <EditUserForm
      id={id}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
      }}
      roles={assignable}
      clubs={clubs}
      isSelf={isSelf}
      roleLabel={ROLE_LABELS[user.role]}
    />
  );
}
