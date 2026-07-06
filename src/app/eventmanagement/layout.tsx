import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Settings2, ExternalLink } from "lucide-react";

import { requireOps, type SessionUser } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";

export default async function EventOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: SessionUser;
  try {
    user = await requireOps();
  } catch {
    redirect("/management/login");
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line/10 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <Link href="/eventmanagement" className="kicker text-ink">
              WSC · Event Ops
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted sm:flex">
              <Link href="/eventmanagement" className="inline-flex items-center gap-1.5 hover:text-ink">
                <LayoutDashboard className="h-4 w-4" /> Overview
              </Link>
              <Link href="/management" className="inline-flex items-center gap-1.5 hover:text-ink">
                <Settings2 className="h-4 w-4" /> CMS
              </Link>
              <Link href="/" className="inline-flex items-center gap-1.5 hover:text-ink">
                <ExternalLink className="h-4 w-4" /> Site
              </Link>
            </nav>
          </div>
          <div className="text-right">
            <p className="text-sm leading-tight text-ink">{user.name}</p>
            <p className="text-[11px] uppercase tracking-wider text-subtle">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
