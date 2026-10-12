"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SportsMatch } from "@/lib/content";
import type { SportMatchEvent } from "@/lib/schemas";
import { readMatchClock } from "@/lib/sports-clock";
import {
  CARD_EVENT_TYPES,
  SCORING_EVENT_TYPES,
  celebrationMs,
  eventKey,
  teamColor,
} from "@/lib/sports-display";
import { cn } from "@/lib/utils";
import { CardCelebration, type CardCue } from "./card-celebration";
import { EventTicker } from "./event-ticker";
import { GoalCelebration, type GoalCue } from "./goal-celebration";
import { StatusOverlay } from "./status-overlay";

const POLL_MS = 1500;
const FETCH_TIMEOUT_MS = 4000;

type ScoreRow = {
  id: number;
  status: SportsMatch["status"];
  scoreA: number | null;
  scoreB: number | null;
  postMatch: SportsMatch["postMatch"];
  events?: SportMatchEvent[];
};

function Score({ value, color }: { value: number; color: string }) {
  return (
    <span className="relative inline-block min-w-[1ch] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "-70%", opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "70%", opacity: 0, scale: 0.7 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="inline-block"
          style={{ textShadow: `0 0 60px ${color}66` }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function MatchDisplay({
  match: initial,
  academyLogo,
}: {
  match: SportsMatch;
  academyLogo?: string;
}) {
  const [match, setMatch] = useState<SportsMatch>(initial);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const seen = useRef<Set<string>>(
    new Set((initial.events ?? []).map((e, i) => eventKey(e, i))),
  );
  const [queue, setQueue] = useState<SportMatchEvent[]>([]);
  const [active, setActive] = useState<SportMatchEvent | null>(null);

  const poll = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(`/api/sports/scores?t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(String(res.status));
      const rows: ScoreRow[] = await res.json();
      const row = rows.find((r) => r.id === initial.id);
      setOffline(false);
      if (!row) return;
      setMatch((prev) => ({
        ...prev,
        status: row.status,
        scoreA: row.scoreA ?? undefined,
        scoreB: row.scoreB ?? undefined,
        postMatch: row.postMatch,
        events: row.events ?? prev.events,
      }));
    } catch {
      setOffline(true);
    }
  }, [initial.id]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    const onOnline = () => poll();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [poll]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const events = match.events ?? [];
    const fresh: { event: SportMatchEvent; key: string }[] = [];
    events.forEach((event, index) => {
      const key = eventKey(event, index);
      if (!seen.current.has(key)) fresh.push({ event, key });
    });
    if (fresh.length === 0) return;
    fresh.forEach(({ key }) => seen.current.add(key));
    const playable = fresh
      .filter(
        ({ event }) =>
          event.celebrate &&
          (SCORING_EVENT_TYPES.has(event.type) ||
            CARD_EVENT_TYPES.has(event.type)),
      )
      .map(({ event }) => event);
    if (playable.length > 0) setQueue((q) => [...q, ...playable]);
  }, [match.events]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    setActive(queue[0]);
    setQueue((q) => q.slice(1));
  }, [active, queue]);

  const goalStyle = match.postMatch?.goalStyle ?? "takeover";

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(
      () => setActive(null),
      celebrationMs(active, goalStyle),
    );
    return () => clearTimeout(id);
  }, [active, goalStyle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const colorA = useMemo(
    () => teamColor("a", match.postMatch?.teamAColor),
    [match.postMatch?.teamAColor],
  );
  const colorB = useMemo(
    () => teamColor("b", match.postMatch?.teamBColor),
    [match.postMatch?.teamBColor],
  );

  const swapped =
    (match.events ?? []).filter((e) => e.type === "swap_display").length % 2 !==
    0;

  const left = {
    name: swapped ? match.teamBName : match.teamAName,
    logo: swapped ? match.teamBLogo : match.teamALogo,
    color: swapped ? colorB : colorA,
    score: (swapped ? match.scoreB : match.scoreA) ?? 0,
    side: swapped ? ("b" as const) : ("a" as const),
  };
  const right = {
    name: swapped ? match.teamAName : match.teamBName,
    logo: swapped ? match.teamALogo : match.teamBLogo,
    color: swapped ? colorA : colorB,
    score: (swapped ? match.scoreA : match.scoreB) ?? 0,
    side: swapped ? ("a" as const) : ("b" as const),
  };

  const clock = readMatchClock(match.postMatch?.timer, now);
  const isLive = match.status === "live";
  const activeIsCard = active ? CARD_EVENT_TYPES.has(active.type) : false;

  const goalCue: GoalCue | null =
    active && !activeIsCard
      ? {
          event: active,
          teamName: active.team === "a" ? match.teamAName : match.teamBName,
          teamLogo: active.team === "a" ? match.teamALogo : match.teamBLogo,
          color: active.team === "a" ? colorA : colorB,
          style: active.style ?? goalStyle,
          side: active.team === left.side ? "left" : "right",
        }
      : null;

  const cardCue: CardCue | null =
    active && activeIsCard
      ? {
          event: active,
          teamName: active.team === "a" ? match.teamAName : match.teamBName,
          teamLogo: active.team === "a" ? match.teamALogo : match.teamBLogo,
        }
      : null;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#05070a] font-sans text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/sports/stadium.webp)", opacity: 0.16 }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070a]/45 via-transparent to-[#05070a]/65" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(5,7,10,0.62) 100%)",
        }}
      />

      <div className="absolute left-10 top-9 z-40 h-20 w-36 xl:h-28 xl:w-52">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/sc-white.png"
          alt="Student Council"
          className="h-full w-full object-contain object-left"
        />
      </div>
      {academyLogo ? (
        <div className="absolute right-10 top-9 z-40 h-20 w-36 xl:h-28 xl:w-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={academyLogo}
            alt="Sports Academy"
            className="h-full w-full object-contain object-right"
          />
        </div>
      ) : null}

      {offline ? (
        <div className="absolute left-1/2 top-4 z-[70] -translate-x-1/2 rounded-full border border-red-500/50 bg-red-950/80 px-5 py-1.5 font-mono text-xs uppercase tracking-[0.3em] text-red-300 backdrop-blur">
          Reconnecting
        </div>
      ) : null}

      <div className="relative z-20 flex h-full flex-col items-center justify-center gap-[2vh] overflow-hidden px-6 pb-[13vh]">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <p className="font-mono text-[min(5vw,8vh)] font-extrabold uppercase leading-none tracking-[0.3em] text-white">
            WFL
          </p>
          <div className="flex items-center gap-4">
            {match.round ? (
              <span className="rounded-full border-2 border-white/80 px-7 py-1.5 font-mono text-base font-bold uppercase tracking-[0.25em] text-white xl:text-xl">
                {match.round}
              </span>
            ) : null}
            {isLive ? (
              <span className="flex items-center gap-2.5 rounded-full bg-white px-6 py-1.5 font-mono text-base font-extrabold uppercase tracking-[0.25em] text-black xl:text-xl">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                </span>
                Live
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid w-full max-w-[1800px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-6 xl:gap-12">
          {[left, right].map((team, i) => (
            <div
              key={i}
              className={cn(
                "flex min-w-0 flex-col gap-5",
                i === 0 ? "order-1 items-end" : "order-3 items-start",
              )}
            >
              {team.logo ? (
                <motion.div
                  className="relative aspect-square w-[min(11vw,19vh)] shrink-0 overflow-hidden rounded-[1.75rem] border-4 bg-white/5"
                  style={{
                    borderColor: `${team.color}66`,
                    boxShadow: `0 0 50px ${team.color}33`,
                  }}
                  animate={
                    goalCue && goalCue.event.team === team.side
                      ? { scale: [1, 1.12, 1], rotate: [0, -3, 3, 0] }
                      : {}
                  }
                  transition={{ duration: 0.8 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={team.logo}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </motion.div>
              ) : null}
              <p
                className={cn(
                  "w-full text-[min(4.6vw,8vh)] font-extrabold uppercase leading-[1.05] tracking-tight text-white",
                  i === 0 ? "text-right" : "text-left",
                )}
                title={team.name}
              >
                {team.name || "TBC"}
              </p>
            </div>
          ))}

          <div className="order-2 flex shrink-0 items-center justify-center font-mono text-[min(13vw,21vh)] font-extrabold leading-none tracking-tighter tabular-nums">
            <Score value={left.score} color={left.color} />
            <span className="mx-5 font-normal text-white/30 xl:mx-9">:</span>
            <Score value={right.score} color={right.color} />
          </div>
        </div>

        {clock ? (
          <div className="flex shrink-0 flex-col items-center gap-4">
            <div className="flex items-center gap-4 rounded-full bg-white px-10 py-3 text-black xl:px-14 xl:py-4">
              {match.postMatch?.timer?.running ? (
                <span className="relative flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600" />
                </span>
              ) : null}
              <span className="font-mono text-[min(4.4vw,7.5vh)] font-extrabold leading-none tracking-tighter tabular-nums">
                {String(Math.floor(clock.elapsedMs / 60000)).padStart(2, "0")}:
                {String(Math.floor((clock.elapsedMs % 60000) / 1000)).padStart(
                  2,
                  "0",
                )}
              </span>
              {clock.stoppage > 0 ? (
                <span className="font-mono text-3xl font-bold leading-none text-red-600 xl:text-5xl">
                  +{clock.stoppage}
                </span>
              ) : null}
            </div>
            {match.venue ? (
              <p className="font-mono text-sm uppercase tracking-[0.4em] text-white/35 xl:text-base">
                {match.venue}
              </p>
            ) : null}
          </div>
        ) : null}

        <AnimatePresence>
          {match.status === "finished" && match.postMatch?.winnerName ? (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
              className="absolute bottom-24 left-1/2 z-30 w-[min(90vw,1100px)] -translate-x-1/2 rounded-3xl border-4 border-white bg-white px-14 py-9 text-center text-black"
            >
              <p className="font-mono text-2xl font-extrabold uppercase tracking-[0.35em] xl:text-4xl">
                Winner
              </p>
              <p className="mt-3 truncate text-5xl font-extrabold uppercase tracking-tight xl:text-7xl">
                {match.postMatch.winnerName}
              </p>
              {match.postMatch.winnerTitle ? (
                <p className="mt-4 truncate font-mono text-xl uppercase tracking-[0.2em] text-black/60 xl:text-3xl">
                  {match.postMatch.winnerTitle}
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {match.status !== "finished" && !match.postMatch?.hideTicker ? (
        <EventTicker
          events={match.events ?? []}
          colorA={colorA}
          colorB={colorB}
          nameA={match.teamAName}
          nameB={match.teamBName}
        />
      ) : null}

      <GoalCelebration cue={goalCue} />
      <CardCelebration cue={cardCue} />
      <StatusOverlay overlay={match.postMatch?.overlay} />
    </div>
  );
}
