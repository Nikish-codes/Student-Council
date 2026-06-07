"use client";

import { motion } from "framer-motion";
import { Mail, ExternalLink } from "lucide-react";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { staggerItem } from "@/components/motion/reveal";
import { Picture } from "@/components/ui/picture";
import type { CouncilMember } from "@/lib/schemas";

export function CouncilGrid({ members }: { members: CouncilMember[] }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {members.map((m) => (
        <motion.div key={m.id} variants={staggerItem}>
          <SpotlightCard className="group/m flex h-full flex-col overflow-hidden">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-2">
              <Picture
                src={m.photo}
                alt={m.name}
                fill
                fallbackLabel={m.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
                className="grayscale transition-all duration-700 ease-out group-hover/m:scale-[1.04] group-hover/m:grayscale-0"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/45 via-transparent to-transparent"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                <div>
                  <span className="kicker text-ink/80">{m.role}</span>
                  <h3 className="display mt-1 text-2xl text-ink">{m.name}</h3>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 p-5 text-xs text-muted">
              <span className="font-mono uppercase tracking-widest">
                {m.program}
              </span>
              <div className="flex items-center gap-2">
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    aria-label={`Email ${m.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full border border-line/15 transition-colors hover:border-line/40 hover:text-ink"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                )}
                {m.linkedin && (
                  <a
                    href={m.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${m.name} on LinkedIn`}
                    className="grid h-8 w-8 place-items-center rounded-full border border-line/15 transition-colors hover:border-line/40 hover:text-ink"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
