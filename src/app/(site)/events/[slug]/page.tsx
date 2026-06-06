import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  MapPin,
  Users,
  Clock,
} from "lucide-react";
import { Picture } from "@/components/ui/picture";
import { Button } from "@/components/ui/button";
import { EventVideo } from "@/components/ui/event-video";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { getEvent, getEvents } from "@/lib/content";
import { EventRegistration } from "@/components/sections/event-registration";
import { cn, formatDate } from "@/lib/utils";

// ISR: "Live now" / "In N days" status is time-sensitive.
export const revalidate = 60;

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.excerpt,
    openGraph: {
      title: event.title,
      description: event.excerpt,
      images: [event.banner],
    },
  };
}

const CAT_ACCENT: Record<string, string> = {
  flagship: "text-amber-200",
  tech: "text-sky-300",
  cultural: "text-rose-200",
  sports: "text-lime-300",
  academic: "text-ink",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const startDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const now = Date.now();
  const startMs = +startDate;
  const endMs = endDate ? +endDate : startMs + 86_400_000;
  const isLive = now >= startMs && now <= endMs;
  const isPast = now > endMs;
  const daysAway = Math.round((startMs - now) / 86_400_000);

  const dayNum = String(startDate.getDate()).padStart(2, "0");
  const monthShort = startDate
    .toLocaleDateString("en-IN", { month: "short" })
    .toUpperCase();
  const dayName = startDate.toLocaleDateString("en-IN", { weekday: "long" });
  const accent = CAT_ACCENT[event.category] ?? "text-ink";

  return (
    <article className="pt-24 sm:pt-32">
      {/* ─── Breadcrumb ─── */}
      <div className="container">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to almanac
        </Link>
      </div>

      {/* ─── Editorial split hero ─── */}
      <header className="container mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
                  isLive
                    ? "border-rose-300/40 text-rose-200"
                    : isPast
                      ? "border-line/10 text-subtle"
                      : daysAway <= 7
                        ? "border-amber-200/40 text-amber-100"
                        : "border-line/20 text-muted",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isLive
                      ? "bg-rose-300 animate-pulse"
                      : isPast
                        ? "bg-subtle"
                        : daysAway <= 7
                          ? "bg-amber-200"
                          : "bg-muted",
                  )}
                  style={
                    isLive
                      ? { boxShadow: "0 0 12px currentColor" }
                      : undefined
                  }
                  aria-hidden
                />
                {isLive
                  ? "Live now"
                  : isPast
                    ? "Past"
                    : daysAway <= 0
                      ? "Today"
                      : daysAway === 1
                        ? "Tomorrow"
                        : `In ${daysAway} days`}
              </span>
              <span className={cn("kicker", accent)}>{event.category}</span>
            </div>

            <h1 className="display mt-8 text-balance text-5xl leading-[0.92] sm:text-7xl lg:text-8xl">
              {event.title}
            </h1>

            <p className="mt-8 max-w-2xl text-pretty text-lg text-muted sm:text-xl">
              {event.excerpt}
            </p>
          </Reveal>

          {/* Date strip */}
          <Reveal delay={0.1}>
            <div className="mt-2 flex items-end gap-6 border-t border-line/10 pt-8">
              <div className="font-display text-[7rem] italic leading-[0.85] text-ink sm:text-[10rem]">
                {dayNum}
              </div>
              <div className="flex flex-col gap-2 pb-4">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink">
                  {monthShort} · {startDate.getFullYear()}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
                  {dayName}
                  {endDate &&
                    ` → ${endDate.toLocaleDateString("en-IN", { weekday: "long" })}`}
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Poster */}
        <div className="lg:col-span-5">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line/15 bg-surface/40">
              <Picture
                src={event.banner}
                alt={event.title}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                fallbackLabel={event.category}
                className="object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/40 via-transparent to-transparent"
              />
            </div>
          </Reveal>
        </div>
      </header>

      {/* ─── Body + sticky aside ─── */}
      <div className="container mt-24 grid gap-16 sm:mt-32 lg:grid-cols-12 lg:gap-20">
        {/* Long-form */}
        <div className="lg:col-span-8">
          <Reveal>
            <span className="kicker">The brief</span>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-ink/90 sm:text-xl">
              {event.description}
            </p>
          </Reveal>

          {/* Quick-fact strip */}
          <Reveal delay={0.05}>
            <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line/10 bg-line/[0.04] sm:grid-cols-3">
              <Fact icon={Calendar} label="Date" value={formatDate(event.date)} />
              <Fact icon={MapPin} label="Venue" value={event.venue} />
              <Fact
                icon={Users}
                label="Capacity"
                value={event.attendees ? `${event.attendees} seats` : "—"}
              />
            </div>
          </Reveal>

          {event.videoUrl ? (
            <Reveal delay={0.08}>
              <div className="mt-16">
                <span className="kicker">Event video</span>
                <div className="mt-6 overflow-hidden rounded-3xl border border-line/15 bg-black/80 p-0 sm:p-3">
                  <EventVideo src={event.videoUrl} title={event.title} poster={event.banner} autoPlay controls={false} fit="contain" />
                </div>
              </div>
            </Reveal>
          ) : null}
        </div>

        {/* Sticky RSVP card */}
        <aside className="lg:col-span-4">
          <div className="sticky top-32 space-y-7 rounded-3xl border border-line/15 bg-surface/40 p-7 backdrop-blur-md">
            <div>
              <span className="kicker">When</span>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                <Calendar className="h-3.5 w-3.5 text-muted" />
                {formatDate(event.date)}
                {event.endDate && ` — ${formatDate(event.endDate)}`}
              </p>
            </div>
            <div>
              <span className="kicker">Where</span>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                <MapPin className="h-3.5 w-3.5 text-muted" />
                {event.venue}
              </p>
            </div>
            {event.attendees && (
              <div>
                <span className="kicker">Capacity</span>
                <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                  <Users className="h-3.5 w-3.5 text-muted" />
                  {event.attendees} attendees
                </p>
              </div>
            )}
            {!isPast && (
              <div>
                <span className="kicker">Countdown</span>
                <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                  <Clock className="h-3.5 w-3.5 text-muted" />
                  {isLive
                    ? "Happening now"
                    : daysAway <= 0
                      ? "Today"
                      : daysAway === 1
                        ? "Tomorrow"
                        : `${daysAway} days away`}
                </p>
              </div>
            )}
            <div className="border-t border-line/10 pt-6">
              {isPast ? (
                <p className="text-xs text-subtle">
                  This event has wrapped. Catch the next one.
                </p>
              ) : event.registrationEnabled && event.id ? (
                <EventRegistration
                  eventId={event.id}
                  title={event.title}
                  priceInPaise={event.priceInPaise ?? 0}
                />
              ) : event.registrationUrl ? (
                <Magnetic className="block">
                  <Button asChild size="lg" className="w-full">
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Register
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                </Magnetic>
              ) : (
                <p className="text-xs text-subtle">
                  Registration opens closer to the event.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

    </article>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-bg p-6">
      <span className="kicker">{label}</span>
      <p className="flex items-center gap-2 text-sm text-ink">
        <Icon className="h-3.5 w-3.5 text-muted" />
        {value}
      </p>
    </div>
  );
}
