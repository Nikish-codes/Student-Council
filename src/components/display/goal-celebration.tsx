"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { SportMatchEvent } from "@/lib/schemas";
import { Confetti } from "./confetti";

export type GoalCue = {
  event: SportMatchEvent;
  teamName: string;
  teamLogo: string;
  color: string;
  style: "takeover" | "flourish";
  side: "left" | "right";
};

const GOAL_WORD = ["G", "O", "A", "L"];

function tagFor(event: SportMatchEvent): string {
  if (event.type === "own_goal") return "Own Goal";
  if (event.type === "penalty_goal") return "Penalty";
  return "";
}

function Takeover({ cue }: { cue: GoalCue }) {
  const { event, teamName, teamLogo, color } = cue;
  const tag = tagFor(event);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 bg-black/[0.92]" />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 55%, ${color}55 0%, ${color}14 38%, transparent 68%)`,
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />

      <Confetti colors={[color, "#ffffff", color, "#f5f5f5"]} />

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-[3px]"
          style={{ borderColor: `${color}88` }}
          initial={{ width: 120, height: 120, opacity: 0.9 }}
          animate={{ width: 2400, height: 2400, opacity: 0 }}
          transition={{ duration: 1.8, delay: i * 0.22, ease: "easeOut" }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-6 px-8">
        {teamLogo ? (
          <motion.div
            initial={{ scale: 0, rotate: -35, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 190,
              damping: 13,
              delay: 0.1,
            }}
            className="relative h-40 w-40 overflow-hidden rounded-[2rem] border-4 bg-white/10 xl:h-52 xl:w-52"
            style={{ borderColor: color, boxShadow: `0 0 90px ${color}99` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={teamLogo}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        ) : null}

        <div className="flex items-end justify-center gap-1 md:gap-3">
          {GOAL_WORD.map((letter, i) => (
            <motion.span
              key={i}
              initial={{ y: 180, opacity: 0, scale: 0.4, rotate: -12 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 14,
                delay: 0.16 + i * 0.07,
              }}
              className="font-mono text-[15vw] font-extrabold leading-[0.85] tracking-tighter text-white xl:text-[230px]"
              style={{ textShadow: `0 0 70px ${color}, 0 0 140px ${color}66` }}
            >
              {letter}
            </motion.span>
          ))}
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 12,
              delay: 0.5,
            }}
            className="font-mono text-[15vw] font-extrabold leading-[0.85] xl:text-[230px]"
            style={{ color, textShadow: `0 0 70px ${color}` }}
          >
            !
          </motion.span>
        </div>

        <motion.p
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="text-center text-[4.4vw] font-extrabold uppercase leading-none tracking-tight text-white xl:text-[68px]"
        >
          {teamName}
        </motion.p>

        {event.player ? (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 16,
              delay: 0.75,
            }}
            className="mt-2 flex items-center gap-5 rounded-full border-2 px-10 py-4 backdrop-blur-sm"
            style={{ borderColor: `${color}aa`, background: `${color}1f` }}
          >
            {event.jersey ? (
              <span
                className="grid h-16 w-16 place-items-center rounded-full font-mono text-3xl font-extrabold text-black xl:h-20 xl:w-20 xl:text-4xl"
                style={{ background: color }}
              >
                {event.jersey}
              </span>
            ) : null}
            <span className="text-[3.4vw] font-bold uppercase leading-none tracking-tight text-white xl:text-[52px]">
              {event.player}
            </span>
            {event.time ? (
              <span className="font-mono text-2xl font-bold text-white/70 xl:text-3xl">
                {event.time}
              </span>
            ) : null}
          </motion.div>
        ) : null}

        {tag || event.assist ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="font-mono text-xl uppercase tracking-[0.3em] text-white/60 xl:text-2xl"
          >
            {[tag, event.assist ? `Assist · ${event.assist}` : ""]
              .filter(Boolean)
              .join("   ·   ")}
          </motion.p>
        ) : null}
      </div>
    </motion.div>
  );
}

function Flourish({ cue }: { cue: GoalCue }) {
  const { event, teamName, teamLogo, color, side } = cue;
  const fromX = side === "left" ? -120 : 120;
  const tag = tagFor(event);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <motion.div
        className="absolute inset-y-0 w-1/2"
        style={{
          [side]: 0,
          background: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, ${color}44, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.45, 1, 0.6] }}
        transition={{ duration: 1.6, times: [0, 0.15, 0.4, 0.6, 1] }}
      />

      <Confetti colors={[color, "#ffffff"]} count={120} duration={3600} />

      <motion.div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-8 border-t-4 px-12 py-7 backdrop-blur-md"
        style={{ borderColor: color, background: "rgba(5,7,10,0.88)" }}
        initial={{ y: 220 }}
        animate={{ y: 0 }}
        exit={{ y: 220 }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
      >
        {teamLogo ? (
          <motion.div
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2"
            style={{ borderColor: color }}
            initial={{ x: fromX, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              delay: 0.12,
              type: "spring",
              stiffness: 200,
              damping: 18,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={teamLogo}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        ) : null}

        <motion.span
          initial={{ x: fromX, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            delay: 0.18,
            type: "spring",
            stiffness: 200,
            damping: 18,
          }}
          className="font-mono text-6xl font-extrabold tracking-tighter xl:text-7xl"
          style={{ color, textShadow: `0 0 40px ${color}aa` }}
        >
          GOAL
        </motion.span>

        <motion.div
          initial={{ x: fromX, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            delay: 0.26,
            type: "spring",
            stiffness: 200,
            damping: 18,
          }}
          className="flex min-w-0 flex-1 items-center gap-5"
        >
          {event.jersey ? (
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full font-mono text-2xl font-extrabold text-black"
              style={{ background: color }}
            >
              {event.jersey}
            </span>
          ) : null}
          <div className="min-w-0">
            {event.player ? (
              <p className="truncate text-5xl font-extrabold uppercase leading-none tracking-tight text-white">
                {event.player}
              </p>
            ) : null}
            <p className="mt-2 truncate font-mono text-xl uppercase tracking-[0.25em] text-white/60">
              {[teamName, tag, event.assist ? `Assist · ${event.assist}` : ""]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          </div>
        </motion.div>

        {event.time ? (
          <span className="shrink-0 font-mono text-5xl font-extrabold tabular-nums text-white/80">
            {event.time}
          </span>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

export function GoalCelebration({ cue }: { cue: GoalCue | null }) {
  return (
    <AnimatePresence>
      {cue ? (
        cue.style === "flourish" ? (
          <Flourish key={cue.event.id} cue={cue} />
        ) : (
          <Takeover key={cue.event.id} cue={cue} />
        )
      ) : null}
    </AnimatePresence>
  );
}
