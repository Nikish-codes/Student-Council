import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users as t, clubs as clubsT } from "@/db/schema";
import { requireRole, ROLES_ALL } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { EditorShell } from "@/components/management/page-header";
import {
  TextField,
  SelectField,
  SaveBar,
} from "@/components/management/fields";
import { updateUser } from "../actions";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const query = searchParams ? await searchParams : {};
  const error = query?.error ? decodeURIComponent(query.error) : null;
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

  const bound = updateUser.bind(null, id);

  return (
    <EditorShell
      kicker={`Edit ${user.email}`}
      title={user.name}
      action={bound}
    >
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : null}
      <TextField name="name" label="Full name" required defaultValue={user.name} />
      <TextField name="email" label="Email" required defaultValue={user.email} />
      <TextField
        name="password"
        label="Reset password"
        minLength={6}
        hint="Leave blank to keep current password · minimum 6 characters. Setting a new one also unlocks the account."
      />
      {isSelf ? (
        <div>
          <p className="kicker text-subtle">Role</p>
          <p className="mt-2 text-sm text-muted">
            {ROLE_LABELS[user.role]} · You cannot change your own role.
          </p>
          <input type="hidden" name="role" value={user.role} />
        </div>
      ) : (
        <SelectField
          name="role"
          label="Role"
          defaultValue={user.role}
          options={assignable}
        />
      )}
      <SelectField
        name="clubId"
        label="Club (only relevant for Club Leads)"
        defaultValue={user.clubId ? String(user.clubId) : ""}
        options={[
          { value: "", label: "— None —" },
          ...clubs.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
      />
      <SaveBar label="Save changes" />
    </EditorShell>
  );
}
