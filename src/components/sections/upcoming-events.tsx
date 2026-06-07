"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { Reveal, StaggerGroup, staggerItem } from "@/components/motion/reveal";
import { Picture } from "@/components/ui/picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/utils";
import type { EventItem } from "@/lib/schemas";

export function UpcomingEvents({ events }: { events: EventItem[] }) {
  return (
    <section className="container py-32 sm:py-48">
      <Reveal>
        <SectionHeading
          kicker="Upcoming"
          title={
            <>
              Don&apos;t miss what&apos;s
              <br className="hidden sm:block" /> happening on campus.
            </>
          }
          description="Bootcamps, hackathons, cultural nights, sports cups and visiting speaker sessions — handpicked by the Council."
          action={
            <Button asChild variant="outline" size="md">
              <Link href="/events">
                All events
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </Button>
          }
        />
      </Reveal>

      <StaggerGroup className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 3).map((e) => {
          const d = shortDate(e.date);
          return (
            <motion.div key={e.slug} variants={staggerItem}>
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
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/50 via-bg/5 to-transparent"
                    />
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <Badge>{e.category}</Badge>
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-baseline gap-2 font-mono text-ink">
                      <span className="display text-5xl leading-none">{d.day}</span>
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
                    <p className="mt-1 text-sm text-muted line-clamp-2">{e.excerpt}</p>
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
      </StaggerGroup>
    </section>
  );
}
