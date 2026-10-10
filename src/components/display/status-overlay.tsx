"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SportDisplayOverlay } from "@/lib/schemas";

const ACCENT: Record<string, string> = {
  halt: "#f59e0b",
  message: "#38bdf8",
  kickoff: "#22c55e",
  halftime: "#a855f7",
  fulltime: "#ffffff",
};

function elapsed(since: number, now: number): string {
  const total = Math.max(0, Math.floor((now - since) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StatusOverlay({ overlay }: { overlay?: SportDisplayOverlay }) {
  const [now, setNow] = useState(() => Date.now());
  const active = !!overlay && overlay.kind !== "none";

  useEffect(() => {
    if (!active || !overlay?.since) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, overlay?.since]);

  const accent = (overlay && ACCENT[overlay.kind]) || "#ffffff";

  return (
    <AnimatePresence>
      {active && overlay ? (
        <motion.div
          key={`${overlay.kind}-${overlay.title}-${overlay.since ?? 0}`}
          className="absolute inset-0 z-[55] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="absolute inset-0 bg-black/[0.94] backdrop-blur-xl" />

          <motion.div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${accent} 0 60px, transparent 60px 120px)`,
            }}
            animate={{ backgroundPositionX: [0, 170] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <motion.div
            className="relative z-10 flex flex-col items-center px-10 text-center"
            initial={{ y: 40, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 18 }}
          >
            <motion.div
              className="mb-10 h-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 40px ${accent}` }}
              initial={{ width: 0 }}
              animate={{ width: "22vw" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />

            <h1
              className="text-[7vw] font-extrabold uppercase leading-[0.95] tracking-tight text-white xl:text-[120px]"
              style={{ textShadow: `0 0 80px ${accent}55` }}
            >
              {overlay.title || "Match Paused"}
            </h1>

            {overlay.subtitle ? (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="mt-8 font-mono text-[2.6vw] uppercase tracking-[0.25em] xl:text-[42px]"
                style={{ color: accent }}
              >
                {overlay.subtitle}
              </motion.p>
            ) : null}

            {overlay.kind === "halt" && overlay.since ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-14 flex items-center gap-5 rounded-full border-2 px-12 py-5"
                style={{
                  borderColor: `${accent}66`,
                  background: `${accent}12`,
                }}
              >
                <span className="relative flex h-4 w-4">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping"
                    style={{ background: accent }}
                  />
                  <span
                    className="relative inline-flex h-4 w-4 rounded-full"
                    style={{ background: accent }}
                  />
                </span>
                <span className="font-mono text-base uppercase tracking-[0.3em] text-white/60 xl:text-xl">
                  Stopped for
                </span>
                <span className="font-mono text-4xl font-extrabold tabular-nums text-white xl:text-5xl">
                  {elapsed(overlay.since, now)}
                </span>
              </motion.div>
            ) : null}

            <motion.div
              className="mt-14 h-[3px] rounded-full bg-white/15"
              initial={{ width: 0 }}
              animate={{ width: "46vw" }}
              transition={{ duration: 0.9, delay: 0.3 }}
            />
            <p className="mt-6 font-mono text-sm uppercase tracking-[0.45em] text-white/35 xl:text-lg">
              Woxsen Football League
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
