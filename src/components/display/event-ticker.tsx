"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { SportMatchEvent } from "@/lib/schemas";
import { eventKey, eventLabel, SCORING_EVENT_TYPES } from "@/lib/sports-display";

const DOT: Record<string, string> = {
  yellow: "#facc15",
  second_yellow: "#f97316",
  red: "#ef4444",
  sub: "#38bdf8",
};

export function EventTicker({
  events,
  colorA,
  colorB,
  nameA,
  nameB,
}: {
  events: SportMatchEvent[];
  colorA: string;
  colorB: string;
  nameA: string;
  nameB: string;
}) {
  const recent = events
    .map((event, index) => ({ event, key: eventKey(event, index) }))
    .filter(
      ({ event }) =>
        !event.replay &&
        event.type !== "other" &&
        event.type !== "swap_display",
    )
    .slice(-4)
    .reverse();

  if (recent.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-7 left-1/2 z-30 w-[min(92vw,1700px)] -translate-x-1/2">
      <div className="flex flex-nowrap items-center justify-center gap-3 overflow-hidden">
        <AnimatePresence initial={false}>
          {recent.map(({ event, key }) => {
            const teamColor = event.team === "a" ? colorA : colorB;
            const dot =
              DOT[event.type] ??
              (SCORING_EVENT_TYPES.has(event.type) ? teamColor : "#94a3b8");
            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-5 py-2 backdrop-blur-sm"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: dot }}
                />
                {event.time ? (
                  <span className="font-mono text-base font-bold tabular-nums text-white/80">
                    {event.time}
                  </span>
                ) : null}
                <span className="font-mono text-sm uppercase tracking-[0.15em] text-white/50">
                  {eventLabel(event.type)}
                </span>
                {event.player || event.description ? (
                  <span className="text-lg font-bold uppercase tracking-tight text-white">
                    {event.player ?? event.description}
                  </span>
                ) : null}
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/35">
                  {event.team === "a" ? nameA : nameB}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
