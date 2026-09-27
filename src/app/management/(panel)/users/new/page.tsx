import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { clubs as clubsT } from "@/db/schema";
import { requireRole, ROLES_ALL } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { NewUserForm } from "../user-form";

export default async function NewUserPage() {
  const me = await requireRole("super_admin", "admin");
  const clubs = await db
    .select({ id: clubsT.id, name: clubsT.name })
    .from(clubsT)
    .orderBy(asc(clubsT.name));

  // admin cannot create super_admin users.
  const roles = (me.role === "super_admin"
    ? ROLES_ALL
    : ROLES_ALL.filter(
        (r) => r !== "super_admin" && r !== "food_committee_member",
      )
  ).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return <NewUserForm roles={roles} clubs={clubs} />;
}
