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

  // Robust score fetching with fallback
  const fetchScores = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      // Add cache buster ?t=... to force browser to skip local cache and always ask the server
      const response = await fetch(`/api/sports/scores?t=${Date.now()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
      // Fallback: If the JSON API fails, trigger a Next.js server refresh
      router.refresh();
    }
  }, [initialMatch.id, router]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchScores(); // Initial fetch

    const interval = setInterval(fetchScores, 5000);

    return () => clearInterval(interval);
  }, [fetchScores]);

  // Monitor online/offline status for immediate refetch
  useEffect(() => {
    const handleOnline = () => {
      fetchScores(); // Immediate refetch when back online
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchScores]);

  const hasScore =
    (match.status === "live" || match.status === "finished") &&
    match.scoreA != null &&
    match.scoreB != null;
  const isLive = match.status === "live";

  // Check if sides are swapped (odd number of swap events means swapped)
  const isSwapped = (match.events?.filter((e) => e.type === "swap_display").length || 0) % 2 !== 0;

  const displayTeamA = isSwapped ? (match.teamBName || "TBC") : (match.teamAName || "TBC");
  const displayTeamB = isSwapped ? (match.teamAName || "TBC") : (match.teamBName || "TBC");
  const displayScoreA = isSwapped ? match.scoreB : match.scoreA;
  const displayScoreB = isSwapped ? match.scoreA : match.scoreB;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden font-sans flex flex-col justify-center px-4">
      {/* Logos at Top Corners */}
      <div className="absolute top-8 left-12 z-50 flex items-center">
        <div className="relative h-20 w-40 sm:h-24 sm:w-48 overflow-hidden">
          <Image
            src="/brand/sc-white.png"
            alt="Student Council"
            fill
            className="object-contain object-left"
          />
        </div>
      </div>
      
      {academyLogo && (
        <div className="absolute top-8 right-12 z-50 flex items-center">
          <div className="relative h-20 w-40 sm:h-24 sm:w-48 overflow-hidden">
            <Image
              src={academyLogo}
              alt="Sports Academy"
              fill
              className="object-contain object-right"
            />
          </div>
        </div>
      )}

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-white text-black px-8 py-3">
          <span className="h-3 w-3 rounded-full bg-black animate-pulse" />
          <span className="font-mono text-xl font-black uppercase tracking-[0.2em]">
            Live
          </span>
        </div>
      )}

      <div className="relative w-full flex flex-col items-center justify-center px-2 md:px-8">
        {/* WFL Header */}
        <div className="mb-6 md:mb-10 w-full text-center">
          <p className="font-mono text-5xl md:text-8xl font-black uppercase tracking-[0.25em] text-white">
            WFL
          </p>
        </div>

        {/* Main scoreboard */}
        <div className="w-full flex flex-row items-center justify-between gap-4 md:gap-8 max-w-[100vw]">
          {/* Team A */}
          <div className="flex-1 min-w-0 px-2">
            <p
              className={cn(
                "font-bold text-white uppercase leading-[1.1] text-right",
                "text-[7vw] lg:text-[6vw] xl:text-[100px]"
              )}
              style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
              title={displayTeamA}
            >
              {displayTeamA}
            </p>
          </div>

          {/* Center score/vs */}
          <div className="flex flex-col items-center justify-center shrink-0">
            {match.round && (
              <div className="mb-4 md:mb-8 rounded-full bg-black border-2 border-white px-8 py-3 whitespace-nowrap">
                <span className="font-mono text-xl md:text-3xl font-bold uppercase tracking-[0.2em] text-white">
                  {match.round}
                </span>
              </div>
            )}

            {hasScore ? (
              <div className="relative">
                <p
                  className={cn(
                    "font-mono tabular-nums leading-none tracking-tighter",
                    "text-[14vw] lg:text-[15vw] xl:text-[200px] font-black text-white whitespace-nowrap"
                  )}
                  aria-label={`${displayTeamA} ${displayScoreA ?? 0}, ${displayTeamB} ${displayScoreB ?? 0}`}
                >
                  <span aria-hidden="true" className="flex items-center">
                    <span>{displayScoreA ?? 0}</span>
                    <span className="mx-4 lg:mx-8 text-white/50 font-normal pb-2 md:pb-4">:</span>
                    <span>{displayScoreB ?? 0}</span>
                  </span>
                </p>
              </div>
            ) : (
              <p className="font-mono text-8xl lg:text-[200px] font-bold uppercase tracking-[0.3em] text-white/60">
                VS
              </p>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 min-w-0 px-2">
            <p
              className={cn(
                "font-bold text-white uppercase leading-[1.1] text-left",
                "text-[7vw] lg:text-[6vw] xl:text-[100px]"
              )}
              style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
              title={displayTeamB}
            >
              {displayTeamB}
            </p>
          </div>
        </div>

        {/* Winner banner for finished matches */}
        {match.status === "finished" && match.postMatch.winnerName && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[90vw] max-w-4xl z-40">
            <div className="bg-white text-black border-4 border-black px-16 py-8 text-center rounded-3xl">
              <p className="font-mono text-2xl md:text-4xl font-black uppercase tracking-[0.25em] mb-2">
                Winner
              </p>
              <p className="display text-5xl md:text-7xl font-bold truncate">
                {match.postMatch.winnerName}
              </p>
              {match.postMatch.winnerTitle && (
                <p className="mt-4 font-mono text-xl md:text-3xl font-semibold uppercase tracking-[0.15em] text-black/70 truncate">
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
