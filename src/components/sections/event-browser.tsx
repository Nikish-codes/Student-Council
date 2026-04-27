"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Picture } from "@/components/ui/picture";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { staggerItem } from "@/components/motion/reveal";
import { cn, shortDate } from "@/lib/utils";
import type { EventCategory, EventItem } from "@/lib/schemas";

const CATEGORIES: { value: EventCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "flagship", label: "Flagship" },
  { value: "tech", label: "Tech" },
  { value: "cultural", label: "Cultural" },
  { value: "sports", label: "Sports" },
  { value: "academic", label: "Academic" },
];

export function EventBrowser({ events }: { events: EventItem[] }) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<EventCategory | "all">("all");

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return events.filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (!query) return true;
      return (
        e.title.toLowerCase().includes(query) ||
        e.venue.toLowerCase().includes(query) ||
        e.excerpt.toLowerCase().includes(query)
      );
    });
  }, [events, q, cat]);

  return (
    <>
      <div className="sticky top-20 z-30 -mx-5 mb-10 border-b border-line/10 bg-bg/70 px-5 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, venues..."
              className="h-11 w-full rounded-full border border-line/10 bg-surface/60 pl-11 pr-4 text-sm text-ink placeholder:text-subtle focus:border-line/30 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCat(c.value)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition-all duration-200",
                  cat === c.value
                    ? "border-ink bg-ink text-bg"
                    : "border-line/15 text-muted hover:border-line/30 hover:text-ink",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-subtle">
          <span className="kicker">
            {filtered.length} event{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="surface-card grid place-items-center py-32 text-center"
          >
            <div className="space-y-3">
              <p className="display text-3xl">No events match.</p>
              <p className="text-sm text-muted">
                Try a different category or clear your search.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((e) => {
              const d = shortDate(e.date);
              return (
                <motion.div
                  key={e.slug}
                  layout
                  variants={staggerItem}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: 10 }}
                >
                  <SpotlightCard className="group/card flex h-full flex-col overflow-hidden">
                    <Link href={`/events/${e.slug}`} className="block">
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <Picture
                          src={e.banner}
                          alt={e.title}
                          fill
                          fallbackLabel={e.category}
                          className="transition-transform duration-700 ease-out group-hover/card:scale-[1.04]"
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/10 to-transparent"
                        />
                        <div className="absolute left-4 top-4">
                          <Badge>{e.category}</Badge>
                        </div>
                        <div className="absolute bottom-4 left-4 flex items-baseline gap-2 font-mono text-ink">
                          <span className="display text-5xl leading-none">
                            {d.day}
                          </span>
                          <span className="text-xs uppercase tracking-widest text-muted">
                            {d.month} · {d.year}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-6">
                        <h3 className="display text-2xl text-ink">{e.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          <span>{e.venue}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted line-clamp-2">
                          {e.excerpt}
                        </p>
                        <div className="mt-auto pt-4">
                          <span className="inline-flex items-center gap-2 text-sm text-ink">
                            Details
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/card:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
