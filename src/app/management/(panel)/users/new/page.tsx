import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as clubsT } from "@/db/schema";
import { requireRole, ROLES_ALL } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { EditorShell } from "@/components/management/page-header";
import {
  TextField,
  SelectField,
  SaveBar,
} from "@/components/management/fields";
import { createUser } from "../actions";

export default async function NewUserPage() {
  const me = await requireRole("super_admin", "admin");
  const clubs = await db
    .select({ id: clubsT.id, name: clubsT.name })
    .from(clubsT)
    .orderBy(asc(clubsT.name));

  // admin cannot create super_admin users.
  const roles = (me.role === "super_admin"
    ? ROLES_ALL
    : ROLES_ALL.filter((r) => r !== "super_admin")
  ).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <EditorShell kicker="New user" title="Invite someone" action={createUser}>
      <TextField name="name" label="Full name" required />
      <TextField
        name="email"
        label="Email"
        required
        placeholder="someone@woxsen.edu.in"
      />
      <TextField
        name="password"
        label="Temporary password"
        required
        hint="Share over a secure channel; ask them to change it later"
      />
      <SelectField
        name="role"
        label="Role"
        options={roles}
        defaultValue="editor"
      />
      <SelectField
        name="clubId"
        label="Club (only relevant for Club Leads)"
        defaultValue=""
        options={[
          { value: "", label: "— None —" },
          ...clubs.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
      />
      <SaveBar label="Create user" />
    </EditorShell>
  );
}
