"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, MapPin, Users } from "lucide-react";
import { Picture } from "@/components/ui/picture";
import {
  gsap,
  prefersSimpleTextMotion,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { getEventTiming } from "@/lib/event-status";
import type { EventCategory, EventItem } from "@/lib/schemas";

const CATEGORIES: { value: EventCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "flagship", label: "Flagship" },
  { value: "tech", label: "Tech" },
  { value: "cultural", label: "Cultural" },
  { value: "sports", label: "Sports" },
  { value: "academic", label: "Academic" },
  { value: "community", label: "Community" },
];

const CAT_ACCENT: Record<EventCategory, string> = {
  flagship: "text-amber-200",
  tech: "text-sky-300",
  cultural: "text-rose-200",
  sports: "text-lime-300",
  academic: "text-ink",
  community: "text-emerald-300",
};

type StatusKind = "live" | "soon" | "open" | "scheduled" | "past";

type View = "now" | "upcoming" | "past";

const VIEWS: View[] = ["now", "upcoming", "past"];

const TABS: { value: View; label: string }[] = [
  { value: "now", label: "Now" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

type Group = { key: string; label: string; events: EventItem[] };

export function EventsAlmanac({
  live,
  upcoming,
  past,
}: {
  live: EventItem[];
  upcoming: EventItem[];
  past: EventItem[];
}) {
  const root = React.useRef<HTMLElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [cat, setCat] = React.useState<EventCategory | "all">("all");
  const [activeKey, setActiveKey] = React.useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL is the single source of truth for the active view (?view=now|upcoming|past).
  // Default to "now" when something is live, else "upcoming".
  const defaultView: View = live.length > 0 ? "now" : "upcoming";
  const paramView = searchParams.get("view");
  const view: View = (VIEWS as readonly string[]).includes(paramView ?? "")
    ? (paramView as View)
    : defaultView;

  const setView = React.useCallback(
    (v: View) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", v);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const counts: Record<View, number> = {
    now: live.length,
    upcoming: upcoming.length,
    past: past.length,
  };

  // Past events arrive in ascending date order; flip to newest-first for the
  // archive-style browse. Now/Upcoming stay ascending for month grouping.
  const pool: EventItem[] =
    view === "now"
      ? live
      : view === "upcoming"
        ? upcoming
        : [...past].reverse();

  const filtered = React.useMemo(
    () => (cat === "all" ? pool : pool.filter((e) => e.category === cat)),
    [pool, cat],
  );

  const groups = React.useMemo<Group[]>(
    () => (view === "past" ? groupByYearDesc(filtered) : groupByMonth(filtered)),
    [filtered, view],
  );

  // Scroll-spy on group sections.
  React.useEffect(() => {
    const els = Array.from(
      root.current?.querySelectorAll<HTMLElement>("[data-group]") ?? [],
    );
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          const top = visible.sort(
            (a, b) =>
              a.target.getBoundingClientRect().top -
              b.target.getBoundingClientRect().top,
          )[0];
          setActiveKey((top.target as HTMLElement).dataset.group ?? null);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [groups]);

  // Reveal animations on slabs.
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const simpleText = prefersSimpleTextMotion();
      const ctx = gsap.context(() => {
        const headline = root.current?.querySelector<HTMLElement>(
          "[data-almanac-headline]",
        );
        if (headline) {
          gsap.set(headline, { opacity: 1 });
          if (!reduced && simpleText) {
            gsap.from(headline, {
              opacity: 0,
              y: 24,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: {
                trigger: headline,
                start: "top 85%",
                once: true,
              },
            });
          } else if (!reduced) {
            const split = new SplitText(headline, {
              type: "chars,words",
              charsClass: "char",
            });
            gsap.set(split.chars, { opacity: 0, y: 50, rotateX: -50 });
            gsap.to(split.chars, {
              opacity: 1,
              y: 0,
              rotateX: 0,
              duration: 0.9,
              ease: "expo.out",
              stagger: { each: 0.022 },
              scrollTrigger: {
                trigger: headline,
                start: "top 85%",
                once: true,
              },
            });
          }
        }

        root.current
          ?.querySelectorAll<HTMLElement>("[data-slab]")
          .forEach((slab) => {
            const date = slab.querySelector<HTMLElement>("[data-slab-date]");
            const meta = slab.querySelectorAll<HTMLElement>("[data-slab-bit]");
            if (date) {
              gsap.set(date, { opacity: 1 });
              if (!reduced) {
                gsap.from(date, {
                  x: -40,
                  opacity: 0,
                  duration: 1,
                  ease: "expo.out",
                  scrollTrigger: {
                    trigger: slab,
                    start: "top 85%",
                    once: true,
                  },
                });
              }
            }
            if (meta.length) {
              gsap.set(meta, { opacity: 1 });
              if (!reduced) {
                gsap.from(meta, {
                  y: 24,
                  opacity: 0,
                  duration: 0.8,
                  ease: "expo.out",
                  stagger: 0.06,
                  scrollTrigger: {
                    trigger: slab,
                    start: "top 85%",
                    once: true,
                  },
                });
              }
            }
          });

        ScrollTrigger.refresh();
      }, root);
      return () => ctx.revert();
    },
    { scope: root, dependencies: [groups, cat, view] },
  );

  // List transition when switching tabs — a gentle fade/slide on the slab
  // column, keyed to the active view so it remounts and re-reveals.
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced) {
        gsap.set(listRef.current, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        listRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      );
    },
    { scope: listRef, dependencies: [view] },
  );

  const railLabel = view === "past" ? "Years" : "Months";
  const poolTotal = pool.length;

  return (
    <section ref={root} className="container mt-40 sm:mt-40">
      {/* Headline */}
      <div className="mb-10 flex items-end justify-between gap-6 border-b border-line/10 pb-10">
        <div>
          <span className="kicker">The Almanac</span>
          <h2
            data-almanac-headline
            className="display mt-6 text-balance text-5xl leading-[0.95] sm:text-7xl"
          >
            Every event. <span className="italic text-accent">In order.</span>
          </h2>
        </div>
        <span className="hidden font-mono text-xs text-subtle sm:block">
          {String(poolTotal).padStart(2, "0")} on the calendar
        </span>
      </div>

      {/* View tabs — editorial segmented header (Now / Upcoming / Past) */}
      <div className="mb-8 flex flex-col gap-6">
        <div className="grid grid-cols-3 divide-x divide-line/10 border-y border-line/10">
          {TABS.map((t) => {
            const isActive = view === t.value;
            const count = counts[t.value];
            const suffix =
              t.value === "now"
                ? "live"
                : t.value === "upcoming"
                  ? "ahead"
                  : "in archive";
            return (
              <button
                key={t.value}
                onClick={() => setView(t.value)}
                aria-pressed={isActive}
                className={cn(
                  "group/tab relative flex flex-col gap-2 px-4 py-6 text-left transition-colors duration-300 sm:px-8 sm:py-8",
                  isActive ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="display text-3xl italic sm:text-4xl">
                    {t.label}.
                  </span>
                  {t.value === "now" && live.length > 0 && <LiveDot />}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
                  {String(count).padStart(2, "0")} {suffix}
                </span>
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Category filter — terminal-style */}
        <div className="-mx-1 flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-sm uppercase tracking-[0.18em]">
          <span className="px-1 text-subtle">Filter:</span>
          {CATEGORIES.map((c, i) => (
            <React.Fragment key={c.value}>
              {i > 0 && <span className="text-subtle/50">·</span>}
              <button
                onClick={() => setCat(c.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  cat === c.value
                    ? "bg-ink text-bg"
                    : "text-muted hover:text-ink",
                )}
              >
                {c.label}
              </button>
            </React.Fragment>
          ))}
          <span className="ml-auto text-subtle">
            {String(filtered.length).padStart(2, "0")} matched
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState view={view} upcomingCount={upcoming.length} setView={setView} />
      ) : (
        <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-12">
          {/* Sticky group rail */}
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-32 flex flex-col gap-2">
              <span className="kicker mb-3 text-sm tracking-[0.2em]">{railLabel}</span>
              {groups.map((g) => {
                const isActive = activeKey === g.key;
                return (
                  <a
                    key={g.key}
                    href={`#group-${g.key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(`group-${g.key}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                    className={cn(
                      "group/m relative flex items-center gap-3 py-3 font-mono text-sm uppercase tracking-[0.18em] transition-colors",
                      isActive ? "text-ink" : "text-subtle hover:text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "h-0.5 transition-all duration-500",
                        isActive ? "w-12 bg-ink" : "w-5 bg-line/30",
                      )}
                    />
                    <span className="flex-1">{g.label}</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        isActive ? "text-ink" : "text-subtle",
                      )}
                    >
                      {String(g.events.length).padStart(2, "0")}
                    </span>
                  </a>
                );
              })}
            </div>
          </aside>

          {/* Slab column */}
          <div ref={listRef} key={view} className="lg:col-span-9">
            {groups.map((g) => (
              <div key={g.key} id={`group-${g.key}`} data-group={g.key}>
                <div className="sticky top-20 z-10 -mx-5 mb-6 flex items-baseline gap-4 bg-bg/85 px-5 py-4 backdrop-blur-md">
                  {view === "past" ? (
                    <>
                      <span className="display italic text-4xl text-ink sm:text-5xl">
                        {g.label}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                        {String(g.events.length).padStart(2, "0")} events
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="display text-3xl text-ink sm:text-4xl">
                        {g.label.split(" ")[0]}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                        {g.label.split(" ")[1]} ·{" "}
                        {String(g.events.length).padStart(2, "0")} events
                      </span>
                    </>
                  )}
                </div>
                <div className="group/list">
                  {g.events.map((e) => (
                    <Slab key={e.slug} event={e} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─────────────── Empty state ─────────────── */

function EmptyState({
  view,
  upcomingCount,
  setView,
}: {
  view: View;
  upcomingCount: number;
  setView: (v: View) => void;
}) {
  if (view === "now") {
    return (
      <div className="grid place-items-center border-y border-line/10 py-32 text-center">
        <div className="space-y-5">
          <p className="display text-3xl">Nothing happening right now.</p>
          <p className="text-sm text-muted">
            {upcomingCount > 0 ? (
              <>
                <span className="tabular-nums text-ink">
                  {String(upcomingCount).padStart(2, "0")}
                </span>{" "}
                upcoming next —{" "}
                <button
                  onClick={() => setView("upcoming")}
                  className="prose-link text-ink underline-offset-4 hover:underline"
                >
                  see what&rsquo;s coming →
                </button>
              </>
            ) : (
              <>
                Nothing on the horizon either.{" "}
                <Link
                  href="/support"
                  className="prose-link text-ink underline-offset-4 hover:underline"
                >
                  Pitch one →
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (view === "past") {
    return (
      <div className="grid place-items-center border-y border-line/10 py-32 text-center">
        <div className="space-y-4">
          <p className="display text-3xl">No history yet.</p>
          <p className="text-sm text-muted">
            Past events will collect here once the first one wraps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid place-items-center border-y border-line/10 py-32 text-center">
      <div className="space-y-4">
        <p className="display text-3xl">Nothing scheduled yet.</p>
        <p className="text-sm text-muted">
          Got an idea?{" "}
          <Link
            href="/support"
            className="prose-link text-ink underline-offset-4 hover:underline"
          >
            Pitch one →
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Live indicator ─────────────── */

function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-flex h-2 w-2", className)}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
      <span
        className="relative inline-flex h-2 w-2 rounded-full bg-accent"
        style={{ boxShadow: "0 0 10px currentColor" }}
      />
    </span>
  );
}

/* ─────────────── Single editorial slab ─────────────── */

function Slab({ event }: { event: EventItem }) {
  const status = computeStatus(event);
  const dayNum = String(new Date(event.date).getDate()).padStart(2, "0");
  const dayName = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "short",
  });
  const monthShort = new Date(event.date)
    .toLocaleDateString("en-IN", { month: "short" })
    .toUpperCase();
  const accent = CAT_ACCENT[event.category];

  return (
    <Link
      href={`/events/${event.slug}`}
      data-slab
      className={cn(
        "group/slab relative block overflow-hidden border-b border-line/10",
        "py-8 transition-opacity duration-500",
        "hover:!opacity-100 group-hover/list:opacity-50",
      )}
    >
      <div className="relative grid grid-cols-12 items-stretch gap-6">
        {/* Poster + date overlay */}
        <div data-slab-date className="col-span-12 sm:col-span-5 lg:col-span-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line/10 bg-surface/40">
            <Picture
              src={event.banner}
              alt={event.title}
              fill
              sizes="(min-width: 1024px) 28vw, (min-width: 640px) 40vw, 90vw"
              fallbackLabel={`${monthShort} · ${dayNum}`}
              className="object-cover transition-transform duration-700 ease-out group-hover/slab:scale-[1.04]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/55 via-bg/10 to-transparent"
            />
            {/* Date overlay */}
            <div className="absolute left-5 top-5 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/80">
              <span>{monthShort}</span>
              <span className="text-subtle">·</span>
              <span>{dayName}</span>
              {event.endDate && (
                <span className="text-subtle">
                  → {String(new Date(event.endDate).getDate()).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="absolute bottom-5 left-5 right-5">
              <div className="font-display text-[5.5rem] italic leading-[0.85] text-ink sm:text-[7rem]">
                {dayNum}
              </div>
            </div>
            {/* Status pill — top right of poster */}
            <div className="absolute right-5 top-5">
              <StatusPill status={status} compact />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="col-span-12 flex flex-col gap-4 sm:col-span-7 lg:col-span-8">
          <div data-slab-bit className="flex items-center gap-3">
            <span className={cn("kicker", accent)}>{event.category}</span>
            <span className="h-px flex-1 bg-line/15" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
              {longLabel(event.date, event.endDate)}
            </span>
          </div>
          <h3
            data-slab-bit
            className="display text-balance text-3xl leading-[1.05] text-ink sm:text-4xl lg:text-5xl"
          >
            {event.title}
          </h3>
          <p
            data-slab-bit
            className="max-w-2xl text-pretty text-sm text-muted sm:text-base"
          >
            {event.excerpt}
          </p>
          <div
            data-slab-bit
            className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm uppercase tracking-[0.18em] text-muted"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden /> {event.venue}
            </span>
            {event.attendees && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" aria-hidden /> Cap ·{" "}
                {event.attendees}
              </span>
            )}
            {event.endDate && <span>Multi-day</span>}
          </div>
          <div
            data-slab-bit
            className="mt-auto flex items-center justify-between border-t border-line/10 pt-5"
          >
            <span className="kicker text-ink">Read brief</span>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line/15 text-ink transition-all duration-500 group-hover/slab:translate-x-1 group-hover/slab:border-line/40">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────── Status pill ─────────────── */

function StatusPill({
  status,
  compact = false,
}: {
  status: StatusKind;
  compact?: boolean;
}) {
  const map: Record<StatusKind, { label: string; cls: string; dot: string }> = {
    live: {
      label: "Live now",
      cls: "border-accent/40 text-accent bg-bg/70 backdrop-blur",
      dot: "bg-accent",
    },
    soon: {
      label: "This week",
      cls: "border-amber-200/40 text-amber-100 bg-bg/70 backdrop-blur",
      dot: "bg-amber-200",
    },
    open: {
      label: "Open",
      cls: "border-lime-200/40 text-lime-100 bg-bg/70 backdrop-blur",
      dot: "bg-lime-300",
    },
    scheduled: {
      label: "Scheduled",
      cls: "border-line/20 text-muted bg-bg/70 backdrop-blur",
      dot: "bg-muted",
    },
    past: {
      label: "Past",
      cls: "border-line/10 text-subtle bg-bg/70 backdrop-blur",
      dot: "bg-subtle",
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-mono text-[10px] uppercase tracking-[0.2em]",
        compact ? "px-2.5 py-1" : "px-3 py-1",
        s.cls,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          s.dot,
          status === "live" && "animate-pulse",
        )}
        style={
          status === "live" ? { boxShadow: "0 0 12px currentColor" } : undefined
        }
        aria-hidden
      />
      {s.label}
    </span>
  );
}

/* ─────────────── Helpers ─────────────── */

function computeStatus(e: EventItem): StatusKind {
  const now = Date.now();
  const { isLive, isPast, daysAway: days } = getEventTiming(e, now);
  if (isLive) return "live";
  if (isPast) return "past";
  if (days <= 7) return "soon";
  if (e.registrationUrl) return "open";
  return "scheduled";
}

function groupByMonth(events: EventItem[]): Group[] {
  const buckets = new Map<string, Group>();
  for (const e of events) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    if (!buckets.has(key)) buckets.set(key, { key, label, events: [] });
    buckets.get(key)!.events.push(e);
  }
  return Array.from(buckets.values());
}

/**
 * Past events arrive newest-first (the page reverses the ascending list).
 * Group preserving encounter order so years surface DESC and, within a year,
 * the most recent event is on top.
 */
function groupByYearDesc(events: EventItem[]): Group[] {
  const buckets = new Map<string, Group>();
  for (const e of events) {
    const key = String(new Date(e.date).getFullYear());
    if (!buckets.has(key)) buckets.set(key, { key, label: key, events: [] });
    buckets.get(key)!.events.push(e);
  }
  return Array.from(buckets.values());
}

function longLabel(date: string, endDate?: string) {
  const d = new Date(date);
  const base = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  if (!endDate) return base;
  const e = new Date(endDate);
  return `${base} → ${e.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
}
