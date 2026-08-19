"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  FilePenLine,
  Gauge,
  Images,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import type { StudioMembership } from "@/lib/club-studio";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/club-management", label: "Dashboard", icon: Gauge },
  { href: "/club-management/page-editor", label: "Page", icon: FilePenLine },
  { href: "/club-management/team", label: "Team", icon: Users },
  { href: "/club-management/events", label: "Events", icon: CalendarDays },
  { href: "/club-management/registrations", label: "Registrations", icon: CheckSquare2 },
  { href: "/club-management/follow-up", label: "Follow-up", icon: Images },
];

export function StudioShell({
  memberships,
  userName,
  children,
}: {
  memberships: StudioMembership[];
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const requested = Number(search.get("club"));
  const active = memberships.find((item) => item.clubId === requested) ?? memberships[0];
  const href = (path: string) => `${path}?club=${active.clubId}`;

  function switchClub(value: string) {
    const params = new URLSearchParams(search.toString());
    params.set("club", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="min-h-[100dvh] bg-bg text-ink">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-line/10 bg-bg/95 px-4 backdrop-blur-md lg:left-[248px] lg:px-7">
        <button
          className="mr-3 rounded-lg p-2 hover:bg-line/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative min-w-0">
          <select
            aria-label="Active club"
            value={active.clubId}
            onChange={(event) => switchClub(event.target.value)}
            className="h-10 max-w-[min(70vw,24rem)] appearance-none rounded-xl border border-line/15 bg-surface-2 py-2 pl-3 pr-10 text-sm font-medium outline-none focus:border-line/40"
          >
            {memberships.map((membership) => (
              <option key={membership.id} value={membership.clubId}>
                {membership.clubName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-subtle" />
        </div>
        <span className="ml-3 hidden text-xs text-subtle sm:block">
          {active.membershipRole === "president" ? "President" : "Team member"}
        </span>
        <Link
          href={`/clubs/${active.clubSlug}`}
          className="ml-auto text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          View public page
        </Link>
      </header>

      {open ? (
        <button
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-line/10 bg-surface transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line/10 px-5">
          <Link className="font-display text-lg font-semibold" href={href("/club-management")}>
            Club Studio
          </Link>
          <button
            className="rounded-lg p-2 hover:bg-line/5 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Club Studio">
          {NAV.map((item) => {
            const selected =
              item.href === "/club-management"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={href(item.href)}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  selected
                    ? "bg-ink font-medium text-bg"
                    : "text-muted hover:bg-line/5 hover:text-ink",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line/10 p-4">
          <p className="truncate text-sm font-medium">{userName}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/management/login" })}
            className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg text-sm text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="px-4 pb-12 pt-24 sm:px-7 lg:ml-[248px]">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
