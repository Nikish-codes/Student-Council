"use client";

import { motion } from "framer-motion";
import type { SportShootout } from "@/lib/schemas";
import { kicksForTeam, readShootout } from "@/lib/sports-shootout";
import { cn } from "@/lib/utils";

export type ShootoutSide = {
  name: string;
  logo: string;
  color: string;
};

function Mark({
  state,
  color,
  index,
}: {
  state: boolean | null;
  color: string;
  index: number;
}) {
  if (state === null) {
    return (
      <span className="h-[3.2vh] w-[3.2vh] rounded-full border-2 border-white/15" />
    );
  }
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 18,
        delay: index * 0.02,
      }}
      className={cn(
        "grid h-[3.2vh] w-[3.2vh] place-items-center rounded-full border-2",
        state ? "border-transparent" : "border-white/25 bg-transparent",
      )}
      style={
        state
          ? { background: color, boxShadow: `0 0 20px ${color}99` }
          : undefined
      }
    >
      {state ? null : (
        <span className="text-[1.8vh] font-black leading-none text-white/45">
          ×
        </span>
      )}
    </motion.span>
  );
}

function Row({
  side,
  marks,
  score,
  isNext,
  isWinner,
  decided,
}: {
  side: ShootoutSide;
  marks: (boolean | null)[];
  score: number;
  isNext: boolean;
  isWinner: boolean;
  decided: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
      className={cn(
        "flex items-center gap-[2vw] rounded-2xl border-2 px-[2.5vw] py-[2vh] transition-colors",
        isWinner
          ? "border-white/60 bg-white/[0.06]"
          : isNext && !decided
            ? "border-white/30 bg-white/[0.03]"
            : "border-white/10",
      )}
    >
      <div
        className="relative aspect-square w-[min(7vw,12vh)] shrink-0 overflow-hidden rounded-2xl border-2 bg-white/5"
        style={{ borderColor: `${side.color}66` }}
      >
        {side.logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={side.logo}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center font-mono text-[3vh] font-extrabold text-white/40">
            {side.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-[1.2vh]">
        <div className="flex items-center gap-[1.2vw]">
          <p
            className={cn(
              "truncate text-[min(3vw,5vh)] font-extrabold uppercase leading-none tracking-tight",
              isWinner || !decided ? "text-white" : "text-white/55",
            )}
          >
            {side.name}
          </p>
          {isNext && !decided ? (
            <span className="shrink-0 rounded-full bg-white px-[1vw] py-[0.4vh] font-mono text-[1.4vh] font-extrabold uppercase tracking-[0.2em] text-black">
              To kick
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-[0.8vw]">
          {marks.map((m, i) => (
            <Mark key={i} state={m} color={side.color} index={i} />
          ))}
        </div>
      </div>

      <span
        className={cn(
          "shrink-0 font-mono text-[min(6vw,10vh)] font-extrabold leading-none tabular-nums",
          isWinner || !decided ? "text-white" : "text-white/50",
        )}
      >
        {score}
      </span>
    </motion.div>
  );
}

export function PenaltyShootout({
  shootout,
  teamA,
  teamB,
}: {
  shootout: SportShootout;
  teamA: ShootoutSide;
  teamB: ShootoutSide;
}) {
  const state = readShootout(shootout);
  const marksA = kicksForTeam(shootout, "a", state.slots);
  const marksB = kicksForTeam(shootout, "b", state.slots);

  const headline = state.decided
    ? "Winners"
    : state.suddenDeath
      ? "Sudden Death"
      : "Penalties";

  const winnerName =
    state.winner === "a" ? teamA.name : state.winner === "b" ? teamB.name : "";

  return (
    <div className="relative z-10 flex w-[min(86vw,1500px)] flex-col items-center gap-[3vh]">
      <div className="flex flex-col items-center gap-[1vh]">
        <p className="font-mono text-[min(1.5vw,2.4vh)] uppercase tracking-[0.45em] text-white/45">
          {state.decided ? "Penalty Shootout" : "Shootout"}
        </p>
        <h1 className="text-[min(6vw,10vh)] font-extrabold uppercase leading-none tracking-tight text-white">
          {headline}
        </h1>
        {state.decided ? (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-[1vh] text-[min(4vw,6.5vh)] font-extrabold uppercase leading-none tracking-tight text-white"
          >
            {winnerName}
          </motion.p>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-[2vh]">
        <Row
          side={teamA}
          marks={marksA}
          score={state.scoreA}
          isNext={state.nextTeam === "a"}
          isWinner={state.winner === "a"}
          decided={state.decided}
        />
        <Row
          side={teamB}
          marks={marksB}
          score={state.scoreB}
          isNext={state.nextTeam === "b"}
          isWinner={state.winner === "b"}
          decided={state.decided}
        />
      </div>
    </div>
  );
}
