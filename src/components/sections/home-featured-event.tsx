import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin } from "lucide-react";
import type { EventItem } from "@/lib/schemas";
import { formatDate } from "@/lib/utils";
import { Picture } from "@/components/ui/picture";

export function HomeFeaturedEvent({ event }: { event?: EventItem }) {
  if (!event) return null;

  return (
    <section className="container py-20 sm:py-28" aria-label="Featured event">
      <Link
        href={`/events/${event.slug}`}
        className="group relative grid overflow-hidden rounded-[2rem] border border-line/15 bg-surface/40 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="relative min-h-[22rem] overflow-hidden bg-black sm:min-h-[28rem] lg:min-h-full">
          <Picture
            src={event.banner}
            alt={event.title}
            fill
            sizes="(min-width: 1024px) 48vw, 100vw"
            fallbackLabel={event.category}
            className="opacity-60 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-75"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg/70 via-bg/15 to-transparent" />
        </div>

        <div className="flex min-h-[22rem] flex-col justify-between p-7 sm:p-10 lg:p-12">
          <div>
            <span className="kicker text-ink">Featured event</span>
            <h2 className="display mt-6 text-balance text-5xl leading-[0.92] text-ink sm:text-7xl">
              {event.title}
            </h2>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              {event.excerpt}
            </p>
          </div>

          <div className="mt-10 grid gap-4 border-t border-line/10 pt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-subtle sm:grid-cols-3">
            <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {formatDate(event.date)}</span>
            <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {event.venue}</span>
            <span className="inline-flex items-center gap-2 text-ink sm:justify-end">
              Open event <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
