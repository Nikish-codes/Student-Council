"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Confetti } from "./confetti";

export type WinCue = {
  teamName: string;
  teamLogo: string;
  color: string;
  scoreLine: string;
  title?: string;
  drawn: boolean;
};

const GOLD = "#f4c860";

function Stage({ cue }: { cue: WinCue }) {
  const accent = cue.drawn ? GOLD : cue.color;
  const heading = cue.drawn ? "Full Time" : "Winners";

  return (
    <motion.div
      className="absolute inset-0 z-[58] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-black/[0.93]" />
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/sports/stadium.webp)" }}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.12, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 46%, ${accent}3d 0%, ${accent}12 40%, transparent 70%)`,
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <Confetti
        colors={[accent, GOLD, "#ffffff", accent]}
        count={320}
        duration={11000}
      />

      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: `${accent}55` }}
          initial={{ width: 160, height: 160, opacity: 0.8 }}
          animate={{ width: 2600, height: 2600, opacity: 0 }}
          transition={{
            duration: 2.6,
            delay: 0.3 + i * 0.5,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 1.4,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-[2.5vh] px-[4vw]">
        <motion.div
          initial={{ scale: 0, rotate: -22, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 14 }}
          className="relative"
          style={{ filter: `drop-shadow(0 0 60px ${accent}aa)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sports/academy-crest.png"
            alt=""
            className="h-[26vh] w-auto object-contain"
          />
        </motion.div>

        <motion.p
          initial={{ y: 50, opacity: 0, letterSpacing: "0.8em" }}
          animate={{ y: 0, opacity: 1, letterSpacing: "0.3em" }}
          transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
          className="font-mono text-[min(5vw,8vh)] font-extrabold uppercase leading-none text-white"
          style={{ textShadow: `0 0 70px ${accent}` }}
        >
          {cue.title || heading}
        </motion.p>

        {!cue.drawn && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-center gap-[2.5vw]"
          >
            {cue.teamLogo ? (
              <div
                className="relative aspect-square w-[min(10vw,16vh)] shrink-0 overflow-hidden rounded-[1.5rem] border-4"
                style={{
                  borderColor: accent,
                  boxShadow: `0 0 70px ${accent}88`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cue.teamLogo}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ) : null}
            <p className="text-[min(6vw,10vh)] font-extrabold uppercase leading-none tracking-tight text-white">
              {cue.teamName}
            </p>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="font-mono text-[min(3vw,5vh)] font-bold tabular-nums tracking-[0.15em] text-white/75"
        >
          {cue.scoreLine}
        </motion.p>

        <motion.div
          className="mt-[2vh] h-[3px] rounded-full"
          style={{ background: `${accent}99` }}
          initial={{ width: 0 }}
          animate={{ width: "38vw" }}
          transition={{ duration: 1, delay: 0.7 }}
        />
        <p className="font-mono text-[min(1.3vw,2.2vh)] uppercase tracking-[0.45em] text-white/40">
          Woxsen Football League
        </p>
      </div>
    </motion.div>
  );
}

export function WinCelebration({ cue }: { cue: WinCue | null }) {
  return (
    <AnimatePresence>
      {cue ? <Stage key={cue.teamName + cue.scoreLine} cue={cue} /> : null}
    </AnimatePresence>
  );
}
