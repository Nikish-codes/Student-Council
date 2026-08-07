import { redirect } from "next/navigation";
import {
  Calendar, Image as ImageIcon, LayoutDashboard, Megaphone, Film,
  Users, Building2, HelpCircle, LifeBuoy, Home, Settings, Sparkles,
  UserCog, ScanLine, Rows3, Tags, GalleryVerticalEnd,
} from "lucide-react";
import { requireOps, isAdmin, type SessionUser } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { SidebarNav, type NavGroup } from "./sidebar-nav";

const SHARED_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/management", label: "Dashboard", icon: LayoutDashboard },
      { href: "/eventmanagement", label: "Event Ops", icon: ScanLine },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/management/events", label: "Events", icon: Calendar },
      { href: "/management/recaps", label: "Recaps", icon: Film },
      { href: "/management/announcements", label: "Announcements", icon: Megaphone },
      { href: "/management/highlights", label: "Highlights", icon: Sparkles },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/management/clubs", label: "Clubs", icon: Building2 },
      { href: "/management/clubs/categories", label: "Club categories", icon: Tags },
      { href: "/management/council", label: "Council", icon: Users },
      { href: "/management/council/groups", label: "Council sections", icon: Rows3 },
      { href: "/management/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/management/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    label: "Media",
    items: [
      { href: "/management/media", label: "Media library", icon: ImageIcon },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Homepage",
    items: [
      { href: "/management/vault", label: "Vault", icon: GalleryVerticalEnd },
      { href: "/management/homepage", label: "Homepage composer", icon: Home },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/management/users", label: "Users", icon: UserCog },
      { href: "/management/settings", label: "Settings", icon: Settings },
    ],
  },
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

  const groups = isAdmin(user.role) ? [...SHARED_NAV, ...ADMIN_NAV] : SHARED_NAV;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SidebarNav
        groups={groups}
        userName={user.name ?? "User"}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="px-6 py-10 pt-16 lg:ml-[240px] lg:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
