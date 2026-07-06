import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar, Image as ImageIcon, LayoutDashboard, Megaphone, Film,
  Users, Building2, HelpCircle, LifeBuoy, Home, Settings, Sparkles,
  UserCog, ScanLine,
} from "lucide-react";
import { requireOps, isAdmin, type SessionUser } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { SignOutButton } from "./sign-out-button";

const NAV = [
  { href: "/management", label: "Dashboard", icon: LayoutDashboard },
  { href: "/eventmanagement", label: "Event Ops", icon: ScanLine },
  { href: "/management/events", label: "Events", icon: Calendar },
  { href: "/management/recaps", label: "Recaps", icon: Film },
  { href: "/management/announcements", label: "Announcements", icon: Megaphone },
  { href: "/management/clubs", label: "Clubs", icon: Building2 },
  { href: "/management/council", label: "Council", icon: Users },
  { href: "/management/highlights", label: "Highlights", icon: Sparkles },
  { href: "/management/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/management/support", label: "Support", icon: LifeBuoy },
  { href: "/management/media", label: "Media", icon: ImageIcon },
];

const ADMIN_NAV = [
  { href: "/management/users", label: "Users", icon: UserCog },
  { href: "/management/homepage", label: "Homepage", icon: Home },
  { href: "/management/settings", label: "Settings", icon: Settings },
];

export default async function PanelLayout({
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

  const nav = isAdmin(user.role) ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line/10 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/management" className="kicker text-ink">
            WSC · Management
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight text-ink">{user.name}</p>
              <p className="text-[11px] uppercase tracking-wider text-subtle">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-line/5 hover:text-ink"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
