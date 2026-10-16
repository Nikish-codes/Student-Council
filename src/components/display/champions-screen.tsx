"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Confetti } from "./confetti";

export type ChampionsCue = {
  teamName: string;
  teamLogo: string;
  color: string;
  season: string;
  subtitle?: string;
};

const GOLD = "#f4c860";
const RAYS = 14;

function Stage({ cue }: { cue: ChampionsCue }) {
  return (
    <motion.div
      className="absolute inset-0 z-[59] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 bg-black/[0.95]" />
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/sports/stadium.webp)" }}
        initial={{ opacity: 0, scale: 1.12 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 2.4, ease: "easeOut" }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[180vh] w-[180vh] -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: 0.5, rotate: 360 }}
        transition={{
          opacity: { duration: 1.6 },
          rotate: { duration: 60, repeat: Infinity, ease: "linear" },
        }}
      >
        {Array.from({ length: RAYS }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 origin-top"
            style={{
              height: "90vh",
              width: "7vh",
              transform: `translate(-50%, 0) rotate(${(360 / RAYS) * i}deg)`,
              background: `linear-gradient(to bottom, ${GOLD}22, transparent 70%)`,
            }}
          />
        ))}
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "70vh",
          height: "70vh",
          background: `radial-gradient(circle, ${cue.color}55 0%, ${GOLD}22 45%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <Confetti
        colors={[GOLD, cue.color, "#ffffff", GOLD]}
        count={380}
        duration={14000}
      />

      <div className="relative z-10 flex flex-col items-center gap-[2vh]">
        <motion.p
          initial={{ y: -40, opacity: 0, letterSpacing: "0.9em" }}
          animate={{ y: 0, opacity: 1, letterSpacing: "0.42em" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="font-mono text-[min(3.4vw,5.5vh)] font-extrabold uppercase leading-none"
          style={{ color: GOLD, textShadow: `0 0 50px ${GOLD}99` }}
        >
          WFL Champions
        </motion.p>

        <motion.div
          initial={{ scale: 0, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 13,
            delay: 0.25,
          }}
          className="relative"
        >
          <motion.div
            className="absolute -inset-[3vh] rounded-[3rem]"
            style={{ border: `0.5vh solid ${GOLD}` }}
            animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.03, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="relative aspect-square w-[min(26vw,42vh)] overflow-hidden rounded-[2.5rem] border-[0.6vh] bg-white/5"
            style={{
              borderColor: GOLD,
              boxShadow: `0 0 18vh ${cue.color}aa, 0 0 9vh ${GOLD}88`,
            }}
          >
            {cue.teamLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cue.teamLogo}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center font-mono text-[14vh] font-extrabold text-white/50">
                {cue.teamName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </motion.div>

        <motion.p
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-[1vh] text-center text-[min(6.5vw,11vh)] font-extrabold uppercase leading-[0.95] tracking-tight text-white"
          style={{ textShadow: `0 0 60px ${cue.color}88` }}
        >
          {cue.teamName}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "30vw" }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="h-[0.5vh] rounded-full"
          style={{ background: GOLD, boxShadow: `0 0 4vh ${GOLD}` }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="font-mono text-[min(2.6vw,4.4vh)] font-extrabold tracking-[0.35em]"
          style={{ color: GOLD }}
        >
          {cue.season}
        </motion.p>

        {cue.subtitle ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="font-mono text-[min(1.5vw,2.4vh)] uppercase tracking-[0.35em] text-white/55"
          >
            {cue.subtitle}
          </motion.p>
        ) : null}
      </div>
    </motion.div>
  );
}

export function ChampionsScreen({ cue }: { cue: ChampionsCue | null }) {
  return (
    <AnimatePresence>
      {cue ? <Stage key={cue.teamName + cue.season} cue={cue} /> : null}
    </AnimatePresence>
  );
}
