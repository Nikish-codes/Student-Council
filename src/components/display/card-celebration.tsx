"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { SportMatchEvent } from "@/lib/schemas";

export type CardCue = {
  event: SportMatchEvent;
  teamName: string;
  teamLogo: string;
};

const YELLOW = "#facc15";
const RED = "#ef4444";

function cardConfig(type: string) {
  if (type === "red") return { label: "Red Card", colors: [RED], accent: RED };
  if (type === "second_yellow") {
    return { label: "Second Yellow — Off", colors: [YELLOW, RED], accent: RED };
  }
  return { label: "Yellow Card", colors: [YELLOW], accent: YELLOW };
}

function CardFace({
  color,
  index,
  total,
  logo,
  teamName,
}: {
  color: string;
  index: number;
  total: number;
  logo?: string;
  teamName: string;
}) {
  const offset = total > 1 ? (index === 0 ? -34 : 34) : 0;
  const tilt = total > 1 ? (index === 0 ? -9 : 7) : 0;
  const showsCrest = index === total - 1;

  return (
    <motion.div
      className="absolute flex h-[42vh] w-[27vh] flex-col items-center justify-start rounded-2xl pt-[3vh] xl:h-[460px] xl:w-[300px]"
      style={{
        background: `linear-gradient(150deg, ${color}, ${color}cc)`,
        boxShadow: `0 0 120px ${color}aa, inset 0 0 60px rgba(0,0,0,0.18)`,
        transformStyle: "preserve-3d",
      }}
      initial={{
        rotateY: -110,
        rotateZ: tilt - 25,
        x: offset,
        scale: 0.5,
        opacity: 0,
      }}
      animate={{ rotateY: 0, rotateZ: tilt, x: offset, scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 170,
        damping: 14,
        delay: 0.1 + index * 0.18,
      }}
    >
      {showsCrest ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.35 }}
          className="flex w-full flex-col items-center gap-[1.6vh] px-[2vh]"
        >
          <div className="relative aspect-square w-[13vh] overflow-hidden rounded-2xl border-[3px] border-black/25 bg-black/20 xl:w-[140px]">
            {logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logo}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center font-mono text-[5vh] font-extrabold text-black/50">
                {teamName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <p className="w-full truncate text-center text-[2.1vh] font-extrabold uppercase tracking-tight text-black/70 xl:text-[22px]">
            {teamName}
          </p>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

function CardStage({ cue }: { cue: CardCue }) {
  const cfg = cardConfig(cue.event.type);

  return (
    <motion.div
      key={cue.event.id}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/[0.94]" />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${cfg.accent}3a 0%, transparent 62%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={{ x: [0, -14, 11, -7, 0] }}
        transition={{ delay: 0.34, duration: 0.42 }}
      >
        <div
          className="relative flex h-[46vh] items-center justify-center xl:h-[500px]"
          style={{ perspective: 1400 }}
        >
          {cfg.colors.map((c, i) => (
            <CardFace
              key={i}
              color={c}
              index={i}
              total={cfg.colors.length}
              logo={cue.teamLogo}
              teamName={cue.teamName}
            />
          ))}
        </div>

        <motion.p
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-10 font-mono text-[3.4vw] font-extrabold uppercase tracking-[0.3em] xl:text-5xl"
          style={{
            color: cfg.accent,
            textShadow: `0 0 50px ${cfg.accent}88`,
          }}
        >
          {cfg.label}
        </motion.p>

        {cue.event.player ? (
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.66, duration: 0.42 }}
            className="mt-7 flex items-center gap-5"
          >
            {cue.event.jersey ? (
              <span
                className="grid h-16 w-16 place-items-center rounded-full font-mono text-3xl font-extrabold text-black xl:h-[72px] xl:w-[72px]"
                style={{ background: cfg.accent }}
              >
                {cue.event.jersey}
              </span>
            ) : null}
            <span className="text-[3.6vw] font-extrabold uppercase leading-none tracking-tight text-white xl:text-[56px]">
              {cue.event.player}
            </span>
          </motion.div>
        ) : null}

        {cue.event.time ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="mt-[2.5vh] font-mono text-[min(2.4vw,4vh)] font-bold tracking-[0.2em] text-white/55"
          >
            {cue.event.time}
          </motion.span>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

export function CardCelebration({ cue }: { cue: CardCue | null }) {
  return (
    <AnimatePresence>
      {cue ? <CardStage key={cue.event.id} cue={cue} /> : null}
    </AnimatePresence>
  );
}
