"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar, Image as ImageIcon, LayoutDashboard, Megaphone, Film,
  Users, Building2, HelpCircle, LifeBuoy, Home, Settings, Sparkles,
  UserCog, ScanLine, Rows3, Tags, GalleryVerticalEnd,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Calendar, ImageIcon, LayoutDashboard, Megaphone, Film,
  Users, Building2, HelpCircle, LifeBuoy, Home, Settings, Sparkles,
  UserCog, ScanLine, Rows3, Tags, GalleryVerticalEnd,
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function SidebarNav({
  groups,
  userName,
  userRole,
}: {
  groups: NavGroup[];
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/management") return pathname === "/management";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const close = () => setOpen(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg border border-line/15 bg-bg/90 p-2 backdrop-blur-xl lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={close}
          className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-line/10 bg-bg transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pt-5">
          <Link
            href="/management"
            onClick={close}
            className="kicker text-ink"
          >
            WSC · Management
          </Link>
          <button
            onClick={close}
            className="rounded-lg p-1 text-subtle hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-subtle/70">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = ICONS[item.icon];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        active
                          ? "bg-line/8 font-medium text-ink"
                          : "text-muted hover:bg-line/5 hover:text-ink"
                      }`}
                    >
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-line/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight text-ink">
                {userName}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-subtle">
                {userRole}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/management/login" })}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-line/5 hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
