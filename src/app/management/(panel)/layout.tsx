import { redirect } from "next/navigation";
import { requirePanelUser, isAdmin, type SessionUser } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";
import { SidebarNav, type NavGroup } from "./sidebar-nav";

const SHARED_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/management", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/eventmanagement", label: "Event Ops", icon: "ScanLine" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/management/events", label: "Events", icon: "Calendar" },
      { href: "/management/recaps", label: "Recaps", icon: "Film" },
      { href: "/management/announcements", label: "Announcements", icon: "Megaphone" },
      { href: "/management/highlights", label: "Highlights", icon: "Sparkles" },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/management/clubs", label: "Clubs", icon: "Building2" },
      { href: "/management/clubs/categories", label: "Club categories", icon: "Tags" },
      { href: "/management/council", label: "Council", icon: "Users" },
      { href: "/management/council/groups", label: "Council sections", icon: "Rows3" },
      { href: "/management/faqs", label: "FAQs", icon: "HelpCircle" },
      { href: "/management/support", label: "Support", icon: "LifeBuoy" },
    ],
  },
  {
    label: "Sports",
    items: [
      { href: "/management/sports", label: "Dashboard", icon: "Trophy" },
      { href: "/management/sports/tournaments", label: "Tournaments", icon: "Medal" },
      { href: "/management/sports/leagues", label: "Leagues", icon: "BarChart3" },
      { href: "/management/sports/matches", label: "Matches", icon: "Activity" },
      { href: "/management/sports/teams", label: "Teams", icon: "Shirt" },
      { href: "/management/sports/people", label: "People", icon: "UserCircle" },
      { href: "/management/sports/settings", label: "Sports settings", icon: "Settings2" },
    ],
  },
  {
    label: "Media",
    items: [
      { href: "/management/media", label: "Media library", icon: "ImageIcon" },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Homepage",
    items: [
      { href: "/management/vault", label: "Vault", icon: "GalleryVerticalEnd" },
      { href: "/management/homepage", label: "Homepage composer", icon: "Home" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/management/users", label: "Users", icon: "UserCog" },
      { href: "/management/settings", label: "Settings", icon: "Settings" },
    ],
  },
];

const OVAL_NAV: NavGroup[] = [
  {
    label: "Dining",
    items: [
      { href: "/management/oval", label: "Oval menu", icon: "UtensilsCrossed" },
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
    user = await requirePanelUser();
  } catch {
    redirect("/management/login");
  }

  const groups =
    user.role === "food_committee_member"
      ? OVAL_NAV
      : user.role === "super_admin"
        ? [...SHARED_NAV, ...OVAL_NAV, ...ADMIN_NAV]
        : isAdmin(user.role)
          ? [...SHARED_NAV, ...ADMIN_NAV]
          : SHARED_NAV;

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
