"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SportDisplayFixture, SportDisplayOverlay } from "@/lib/schemas";

const ACCENT: Record<string, string> = {
  halt: "#f59e0b",
  message: "#38bdf8",
  kickoff: "#22c55e",
  halftime: "#a855f7",
  fulltime: "#ffffff",
  league: "#ffffff",
  upcoming: "#38bdf8",
};

function elapsed(since: number, now: number): string {
  const total = Math.max(0, Math.floor((now - since) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function kickoffLabel(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
}

function Crest({ src, name }: { src?: string; name: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-[2vh]">
      <div className="relative aspect-square w-[min(11vw,18vh)] overflow-hidden rounded-[2rem] border-4 border-white/15 bg-white/5">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center font-mono text-[min(4vw,7vh)] font-extrabold text-white/40">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className="max-w-[26vw] text-center text-[min(2.6vw,4.4vh)] font-extrabold uppercase leading-tight tracking-tight text-white">
        {name}
      </p>
    </div>
  );
}

function UpcomingCard({ fixture }: { fixture: SportDisplayFixture }) {
  const kickoff = kickoffLabel(fixture.matchDate);
  return (
    <div className="flex flex-col items-center gap-[4vh]">
      <div className="flex items-center justify-center gap-[5vw]">
        <Crest src={fixture.teamALogo} name={fixture.teamAName} />
        <span className="font-mono text-[min(4vw,7vh)] font-black uppercase tracking-[0.2em] text-white/35">
          vs
        </span>
        <Crest src={fixture.teamBLogo} name={fixture.teamBName} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-[3vw] gap-y-[1.5vh] font-mono text-[min(1.9vw,3.2vh)] uppercase tracking-[0.25em] text-white/55">
        {fixture.round ? <span>{fixture.round}</span> : null}
        {kickoff ? <span className="text-white/80">{kickoff}</span> : null}
        {fixture.venue ? <span>{fixture.venue}</span> : null}
      </div>
    </div>
  );
}

export function StatusOverlay({ overlay }: { overlay?: SportDisplayOverlay }) {
  const [now, setNow] = useState(() => Date.now());
  const active = !!overlay && overlay.kind !== "none";

  useEffect(() => {
    if (!active || !overlay?.since) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, overlay?.since]);

  if (!active || !overlay) return <AnimatePresence />;

  const accent = ACCENT[overlay.kind] ?? "#ffffff";
  const isLeague = overlay.kind === "league";
  const isUpcoming = overlay.kind === "upcoming";

  return (
    <AnimatePresence>
      <motion.div
        key={`${overlay.kind}-${overlay.title}-${overlay.since ?? 0}`}
        className="absolute inset-0 z-[55] flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="absolute inset-0 bg-black/[0.94] backdrop-blur-xl" />

        {isLeague || isUpcoming ? (
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/sports/stadium.webp)" }}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 0.16, scale: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        ) : (
          <motion.div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${accent} 0 60px, transparent 60px 120px)`,
            }}
            animate={{ backgroundPositionX: [0, 170] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        )}

        <motion.div
          className="relative z-10 flex max-h-full flex-col items-center px-[4vw] text-center"
          initial={{ y: 40, scale: 0.94, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 18 }}
        >
          <motion.div
            className="mb-[4vh] h-[0.9vh] rounded-full"
            style={{ background: accent, boxShadow: `0 0 40px ${accent}` }}
            initial={{ width: 0 }}
            animate={{ width: "22vw" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          <h1
            className="text-[min(6.5vw,11vh)] font-extrabold uppercase leading-[0.95] tracking-tight text-white"
            style={{ textShadow: `0 0 80px ${accent}55` }}
          >
            {overlay.title || "Match Paused"}
          </h1>

          {overlay.subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-[3vh] font-mono text-[min(4.4vw,7.2vh)] font-bold uppercase leading-[1.05] tracking-[0.12em]"
              style={{ color: accent }}
            >
              {overlay.subtitle}
            </motion.p>
          ) : null}

          {isUpcoming && overlay.fixture ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-[5vh]"
            >
              <UpcomingCard fixture={overlay.fixture} />
            </motion.div>
          ) : null}

          {overlay.kind === "halt" && overlay.since ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-[5vh] flex items-center gap-5 rounded-full border-2 px-12 py-5"
              style={{ borderColor: `${accent}66`, background: `${accent}12` }}
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
              <span className="font-mono text-[min(1.7vw,2.8vh)] uppercase tracking-[0.3em] text-white/60">
                Stopped for
              </span>
              <span className="font-mono text-[min(3vw,5vh)] font-extrabold tabular-nums text-white">
                {elapsed(overlay.since, now)}
              </span>
            </motion.div>
          ) : null}

          <motion.div
            className="mt-[5vh] h-[3px] rounded-full bg-white/15"
            initial={{ width: 0 }}
            animate={{ width: "46vw" }}
            transition={{ duration: 0.9, delay: 0.3 }}
          />
          {isLeague ? null : (
            <p className="mt-[2.5vh] font-mono text-[min(1.3vw,2.2vh)] uppercase tracking-[0.45em] text-white/35">
              Woxsen Football League
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
