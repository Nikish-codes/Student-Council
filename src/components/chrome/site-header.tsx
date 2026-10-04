"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = { href: string; label: string; disabled?: boolean };

const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/oval", label: "Oval" },
  { href: "/sports", label: "Sports" },
  { href: "/council", label: "Council" },
  { href: "/events", label: "Events" },
  { href: "/clubs", label: "Clubs" },
  { href: "/support", label: "Support" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out",
        scrolled ? "glass py-3" : "glass-soft py-5",
      )}
    >
      <div className="container flex items-center justify-between gap-6">
        <Link
          href="/"
          className="group/brand relative grid h-12 w-12 shrink-0 place-items-center sm:h-14 sm:w-14"
          aria-label="Woxsen Student Council home"
        >
          {/* Masked crest — see .brand-crest. This mark sits in the header of
              every page at 40–48px; it was previously two 1563px PNGs. */}
          <span
            aria-hidden
            className="brand-crest h-10 w-10 text-ink transition-transform duration-500 group-hover/brand:scale-110 sm:h-12 sm:w-12"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className="relative rounded-full px-4 py-2 text-sm text-subtle/60 transition-colors duration-300"
                  title="Coming soon"
                >
                  {item.label}
                  <span className="ml-1 align-super font-mono text-[9px] uppercase tracking-[0.15em] text-subtle/50">
                    soon
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm transition-colors duration-300",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {active && (
                  <span className="absolute inset-x-4 -bottom-0.5 -z-10 h-0.5 rounded-full bg-accent" />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Button asChild size="sm" variant="outline">
            <Link href="/support#grievance-form">Raise a concern</Link>
          </Button>
        </div>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-line/15 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[70] bg-bg/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <Dialog.Content className="fixed inset-x-4 top-4 z-[80] origin-top rounded-2xl border border-line/10 bg-surface p-6 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
              <Dialog.Title className="sr-only">Menu</Dialog.Title>
              <div className="mb-6 flex items-center justify-between">
                <span className="kicker">Menu</span>
                <Dialog.Close asChild>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-full border border-line/15"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV.map((item) =>
                  item.disabled ? (
                    <span
                      key={item.href}
                      aria-disabled="true"
                      className="display flex items-center gap-3 rounded-xl px-3 py-3 text-3xl text-subtle/50"
                    >
                      {item.label}
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle/40">
                        soon
                      </span>
                    </span>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="display block rounded-xl px-3 py-3 text-3xl text-ink hover:bg-line/[0.04]"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </nav>
              <div className="mt-6 border-t border-line/10 pt-6">
                <Button asChild size="md" className="w-full">
                  <Link href="/support#grievance-form">Raise a concern</Link>
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
