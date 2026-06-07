import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventItem } from "@/lib/schemas";

export function EventsGraveyard({ events }: { events: EventItem[] }) {
  if (events.length === 0) return null;
  return (
    <section className="container mt-40 mb-24 sm:mt-40">
      <div className="mb-10 flex items-end justify-between gap-6 border-t border-line/10 pt-10">
        <div>
          <span className="kicker">The Archive</span>
          <h2 className="display mt-6 text-balance text-4xl leading-[0.95] sm:text-5xl">
            What we&apos;ve already shipped.
          </h2>
        </div>
        <span className="hidden font-mono text-xs text-subtle sm:block">
          {String(events.length).padStart(2, "0")} events · this session
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line/10 bg-line/[0.04] sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => {
          const d = new Date(e.date);
          const date = d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          return (
            <li key={e.slug} className="bg-bg">
              <Link
                href={`/events/${e.slug}`}
                className="group/g flex h-full items-center gap-4 p-5 grayscale transition-all duration-300 hover:grayscale-0 hover:bg-surface/40"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
                  {date}
                </span>
                <span
                  className={cn(
                    "flex-1 truncate text-sm text-muted",
                    "decoration-line/30 group-hover/g:text-ink",
                  )}
                  style={{ textDecoration: "line-through" }}
                >
                  {e.title}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-subtle transition-all duration-300 group-hover/g:translate-x-0.5 group-hover/g:text-ink" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
