import { redirect } from "next/navigation";

import { requireUser } from "@/lib/rbac";
import { getStudioMemberships } from "@/lib/club-studio";
import { StudioShell } from "./studio-shell";

export default async function ClubManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, memberships] = await Promise.all([
    requireUser(),
    getStudioMemberships(),
  ]);
  if (memberships.length === 0) redirect("/management");
  return (
    <StudioShell memberships={memberships} userName={user.name ?? "Club team"}>
      {children}
    </StudioShell>
  );
}
