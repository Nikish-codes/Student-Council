"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { SportsMatch } from "@/lib/content";
import { cn } from "@/lib/utils";

type LiveScoreUpdate = {
  id: number;
  status: SportsMatch["status"];
  scoreA: number | null;
  scoreB: number | null;
  postMatch: SportsMatch["postMatch"];
  events?: SportsMatch["events"];
};

export function BigScreenDisplay({ match: initialMatch, academyLogo }: { match: SportsMatch; academyLogo?: string }) {
  const [match, setMatch] = useState<SportsMatch>(initialMatch);
  const router = useRouter();
  const [displayMs, setDisplayMs] = useState(initialMatch.postMatch?.timer?.elapsedMs || 0);

  const fetchScores = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); 
      const response = await fetch(`/api/sports/scores?t=${Date.now()}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: LiveScoreUpdate[] = await response.json();
      const update = data.find((s) => s.id === initialMatch.id);
      if (update) {
        setMatch((prev) => ({
          ...prev,
          status: update.status,
          scoreA: update.scoreA ?? undefined,
          scoreB: update.scoreB ?? undefined,
          postMatch: update.postMatch,
          events: update.events ?? prev.events,
        }));
      }
    } catch (err) {
      console.error("[Big Screen] Score fetch failed, falling back to page refresh:", err);
      router.refresh();
    }
  }, [initialMatch.id, router]);

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 5000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  useEffect(() => {
    const handleOnline = () => fetchScores();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchScores]);

  useEffect(() => {
    let frame: number;
    const updateTimer = () => {
      const timer = match.postMatch?.timer;
      if (!timer) return;

      const durationMs = (timer.matchDuration || 90) * 60000;
      const halfTimeMs = durationMs / 2;
      const fullTimeMs = durationMs + (timer.stoppageTime || 0) * 60000;

      let effectiveElapsed = timer.elapsedMs;
      
      if (timer.running && timer.startTime) {
        effectiveElapsed = Date.now() - timer.startTime + timer.elapsedMs;
      }

      if (timer.elapsedMs < halfTimeMs && effectiveElapsed >= halfTimeMs) {
        effectiveElapsed = halfTimeMs;
      }
      if (timer.elapsedMs >= halfTimeMs && effectiveElapsed >= fullTimeMs) {
        effectiveElapsed = fullTimeMs;
      }

      setDisplayMs(effectiveElapsed);
      frame = requestAnimationFrame(updateTimer);
    };

    if (match.postMatch?.timer) {
      frame = requestAnimationFrame(updateTimer);
    }
    
    return () => cancelAnimationFrame(frame);
  }, [match.postMatch?.timer]);

  const timer = match.postMatch?.timer;
  
  const currentMins = Math.floor(displayMs / 60000);
  const currentSecs = Math.floor((displayMs % 60000) / 1000);
  const formatTime = (m: number, s: number) =>
    `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const durationMs = (timer?.matchDuration || 90) * 60000;
  const halfTimeMs = durationMs / 2;
  const fullTimeMs = durationMs + (timer?.stoppageTime || 0) * 60000;

  // Safe checks for halftone overlay (using rounded seconds to avoid ms jitter)
  const isHalfTime = currentMins === (timer?.matchDuration || 90) / 2 && currentSecs === 0 && timer && !timer.running;
  const isFullTime = displayMs >= fullTimeMs;

  const isLive = match.status === "live";

  const isSwapped = (match.events?.filter((e) => e.type === "swap_display").length || 0) % 2 !== 0;
  const displayTeamA = isSwapped ? (match.teamBName || "TBC") : (match.teamAName || "TBC");
  const displayTeamB = isSwapped ? (match.teamAName || "TBC") : (match.teamBName || "TBC");
  const displayScoreA = isSwapped ? match.scoreB : match.scoreA;
  const displayScoreB = isSwapped ? match.scoreA : match.scoreB;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden font-sans flex flex-col justify-center px-4 pb-20">
      {/* Logos at Top Corners */}
      <div className="absolute top-8 md:top-12 left-8 md:left-16 z-50 flex items-center">
        <div className="relative h-20 w-32 sm:h-28 sm:w-48 overflow-hidden">
          <Image
            src="/brand/sc-white.png"
            alt="Student Council"
            fill
            className="object-contain object-left"
          />
        </div>
      </div>
      
      {academyLogo && (
        <div className="absolute top-8 md:top-12 right-8 md:right-16 z-50 flex items-center">
          <div className="relative h-20 w-32 sm:h-28 sm:w-48 overflow-hidden">
            <Image
              src={academyLogo}
              alt="Sports Academy"
              fill
              className="object-contain object-right"
            />
          </div>
        </div>
      )}

      {/* LIVE badge (Top Center if no timer) */}
      {!timer && isLive && (
        <div className="absolute top-10 md:top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-white text-black px-8 py-3">
          <span className="h-4 w-4 rounded-full bg-black animate-pulse" />
          <span className="font-mono text-xl font-black uppercase tracking-[0.2em]">
            Live
          </span>
        </div>
      )}

      <div className="relative w-full flex flex-col items-center justify-center px-4 md:px-12 mt-12">
        
        {/* WFL Header */}
        <div className="mb-12 w-full flex flex-col items-center gap-4">
          <p className="font-mono text-5xl md:text-7xl xl:text-[100px] font-black uppercase tracking-[0.25em] text-white leading-none">
            WFL
          </p>
        </div>

        {/* Main scoreboard */}
        <div className="w-full flex flex-row items-center justify-between gap-4 md:gap-12 max-w-[100vw]">
          {/* Team A */}
          <div className="flex-1 min-w-0 px-2 flex justify-end">
            <p
              className={cn(
                "font-bold text-white uppercase leading-[1.1] text-right tracking-tight",
                "text-[6vw] lg:text-[5.5vw] xl:text-[100px]"
              )}
              style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}
              title={displayTeamA}
            >
              {displayTeamA}
            </p>
          </div>

          {/* Center score */}
          <div className="flex flex-col items-center justify-center shrink-0 min-w-[20vw]">
            {match.round && (
              <div className="mb-6 md:mb-10 rounded-full bg-black border-2 border-white px-8 py-2 md:py-3 whitespace-nowrap">
                <span className="font-mono text-xl md:text-3xl font-bold uppercase tracking-[0.2em] text-white">
                  {match.round}
                </span>
              </div>
            )}

            <div className="relative">
              <p
                className={cn(
                  "font-mono tabular-nums leading-none tracking-tighter",
                  "text-[12vw] lg:text-[11vw] xl:text-[220px] font-black text-white whitespace-nowrap"
                )}
                aria-label={`${displayTeamA} ${displayScoreA ?? 0}, ${displayTeamB} ${displayScoreB ?? 0}`}
              >
                <span aria-hidden="true" className="flex items-center">
                  <span>{displayScoreA ?? 0}</span>
                  <span className="mx-6 lg:mx-10 text-white/50 font-normal pb-3 md:pb-6">:</span>
                  <span>{displayScoreB ?? 0}</span>
                </span>
              </p>
            </div>
          </div>

          {/* Team B */}
          <div className="flex-1 min-w-0 px-2 flex justify-start">
            <p
              className={cn(
                "font-bold text-white uppercase leading-[1.1] text-left tracking-tight",
                "text-[6vw] lg:text-[5.5vw] xl:text-[100px]"
              )}
              style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}
              title={displayTeamB}
            >
              {displayTeamB}
            </p>
          </div>
        </div>

        {/* Timer Display - Moved BELOW scoreboard */}
        {timer && (
          <div className="mt-12 md:mt-16 flex flex-col items-center z-50">
            <div className="flex items-center justify-center gap-4 bg-white text-black px-10 md:px-14 py-3 md:py-4 rounded-full shadow-2xl">
              {timer.running && (
                <span className="h-4 w-4 md:h-5 md:w-5 rounded-full bg-red-600 animate-pulse" />
              )}
              <span className="font-mono text-5xl md:text-7xl font-black tracking-tighter tabular-nums leading-none">
                {formatTime(currentMins, currentSecs)}
              </span>
              {timer.stoppageTime ? (
                <span className="font-mono text-3xl md:text-5xl font-bold text-red-600 leading-none">
                  +{timer.stoppageTime}
                </span>
              ) : null}
            </div>
            
            {isHalfTime && (
              <div className="mt-6 font-mono text-3xl md:text-5xl font-black uppercase tracking-[0.25em] text-white bg-black px-10 py-4 rounded-2xl border-4 border-white shadow-2xl">
                Half Time
              </div>
            )}
            
            {isFullTime && match.status !== "finished" && (
              <div className="mt-6 font-mono text-3xl md:text-5xl font-black uppercase tracking-[0.25em] text-white bg-black px-10 py-4 rounded-2xl border-4 border-white shadow-2xl">
                Full Time
              </div>
            )}
          </div>
        )}

        {/* Winner banner for finished matches */}
        {match.status === "finished" && match.postMatch.winnerName && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[90vw] max-w-5xl z-40">
            <div className="bg-white text-black border-4 border-black px-16 py-10 text-center rounded-3xl shadow-2xl">
              <p className="font-mono text-3xl md:text-5xl font-black uppercase tracking-[0.25em] mb-4">
                Winner
              </p>
              <p className="display text-6xl md:text-8xl font-bold truncate">
                {match.postMatch.winnerName}
              </p>
              {match.postMatch.winnerTitle && (
                <p className="mt-6 font-mono text-2xl md:text-4xl font-semibold uppercase tracking-[0.15em] text-black/70 truncate">
                  {match.postMatch.winnerTitle}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
