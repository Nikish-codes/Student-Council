"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { SportsMatch } from "@/lib/content";
import { SPORT_LABELS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type LiveScoreUpdate = {
  id: number;
  status: SportsMatch["status"];
  scoreA: number | null;
  scoreB: number | null;
  postMatch: SportsMatch["postMatch"];
  events?: SportsMatch["events"];
};

export function BigScreenDisplay({ match: initialMatch }: { match: SportsMatch }) {
  const [match, setMatch] = useState<SportsMatch>(initialMatch);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Robust score fetching with fallback
  const fetchScores = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const response = await fetch("/api/sports/scores", {
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
        setLastUpdate(new Date());
        setFetchError(false);
      }

      setIsOnline(true);
    } catch (err) {
      console.error("[Big Screen] Score fetch failed:", err);
      setFetchError(true);
      setIsOnline(navigator.onLine);
    }
  }, [initialMatch.id]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchScores(); // Initial fetch

    const interval = setInterval(fetchScores, 5000);

    return () => clearInterval(interval);
  }, [fetchScores]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchScores(); // Immediate refetch when back online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchScores]);

  const hasScore =
    (match.status === "live" || match.status === "finished") &&
    match.scoreA != null &&
    match.scoreB != null;
  const isLive = match.status === "live";
  const teamAName = match.teamAName || "TBC";
  const teamBName = match.teamBName || "TBC";

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0A0D12] via-[#0F131C] to-[#161D2B] overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Connection status indicator */}
      {(!isOnline || fetchError) && (
        <div className="absolute top-8 left-8 z-50 flex items-center gap-3 rounded-full bg-red-500/20 backdrop-blur-xl border border-red-500/30 px-6 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-sm font-semibold text-red-400 uppercase tracking-wider">
            {!isOnline ? "Offline" : "Connection Error"}
          </span>
        </div>
      )}

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-8 right-8 z-50 flex items-center gap-3 rounded-full bg-accent/20 backdrop-blur-xl border border-accent/40 px-8 py-4 shadow-[0_0_60px_-12px_rgba(238,73,92,0.6)]">
          <span className="h-4 w-4 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-xl font-black text-accent uppercase tracking-[0.2em]">
            Live
          </span>
        </div>
      )}

      <div className="relative h-full flex flex-col items-center justify-center px-16 py-12">
        {/* Competition title */}
        {match.competitionTitle && (
          <div className="mb-8">
            <p className="font-mono text-2xl font-bold uppercase tracking-[0.25em] text-muted/80 text-center">
              {match.competitionTitle}
            </p>
          </div>
        )}

        {/* Main scoreboard */}
        <div className="w-full max-w-[1800px] grid grid-cols-[1fr_auto_1fr] items-center gap-12">
          {/* Team A */}
          <TeamDisplay
            name={teamAName}
            logo={match.teamALogo}
            align="right"
            isLive={isLive}
          />

          {/* Center score/vs */}
          <div className="flex flex-col items-center justify-center px-20">
            {match.round && (
              <div className="mb-6 rounded-2xl bg-line/10 backdrop-blur-sm border border-line/20 px-8 py-3">
                <span className="font-mono text-2xl font-bold uppercase tracking-[0.2em] text-subtle">
                  {match.round}
                </span>
              </div>
            )}

            {hasScore ? (
              <div className="relative">
                <p
                  className={cn(
                    "font-mono tabular-nums leading-none tracking-tighter",
                    isLive
                      ? "text-[240px] font-black text-ink drop-shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                      : "text-[200px] font-bold text-ink/90"
                  )}
                  aria-label={`${teamAName} ${match.scoreA ?? 0}, ${teamBName} ${match.scoreB ?? 0}`}
                >
                  <span aria-hidden="true" className="flex items-center">
                    <span className={cn(
                      "transition-all duration-500",
                      isLive && "text-accent"
                    )}>
                      {match.scoreA ?? 0}
                    </span>
                    <span className="mx-12 text-line/40 font-normal">:</span>
                    <span className={cn(
                      "transition-all duration-500",
                      isLive && "text-accent"
                    )}>
                      {match.scoreB ?? 0}
                    </span>
                  </span>
                </p>
              </div>
            ) : (
              <p className="font-mono text-8xl font-bold uppercase tracking-[0.3em] text-muted/60">
                VS
              </p>
            )}

            {/* Sport label */}
            <div className="mt-10">
              <span className="font-mono text-3xl font-semibold uppercase tracking-[0.2em] text-muted/70">
                {SPORT_LABELS[match.sport]}
              </span>
            </div>
          </div>

          {/* Team B */}
          <TeamDisplay
            name={teamBName}
            logo={match.teamBLogo}
            align="left"
            isLive={isLive}
          />
        </div>

        {/* Winner banner for finished matches */}
        {match.status === "finished" && match.postMatch.winnerName && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl">
            <div className="rounded-3xl bg-gradient-to-r from-accent/20 via-accent/30 to-accent/20 backdrop-blur-xl border border-accent/40 px-16 py-8 text-center shadow-[0_0_80px_-12px_rgba(238,73,92,0.5)]">
              <p className="font-mono text-3xl font-black uppercase tracking-[0.25em] text-accent mb-2">
                Winner
              </p>
              <p className="display text-7xl font-bold text-ink">
                {match.postMatch.winnerName}
              </p>
              {match.postMatch.winnerTitle && (
                <p className="mt-4 font-mono text-2xl font-semibold uppercase tracking-[0.15em] text-muted">
                  {match.postMatch.winnerTitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Match venue - bottom left */}
        {match.venue && (
          <div className="absolute bottom-8 left-8">
            <p className="font-mono text-xl font-semibold uppercase tracking-[0.15em] text-muted/70">
              📍 {match.venue}
            </p>
          </div>
        )}

        {/* Last update timestamp - bottom right */}
        <div className="absolute bottom-8 right-8">
          <p className="font-mono text-lg font-medium text-muted/50">
            Updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamDisplay({
  name,
  logo,
  align,
  isLive,
}: {
  name: string;
  logo: string;
  align: "left" | "right";
  isLive: boolean;
}) {
  const isUnconfirmed = name === "Participant to be confirmed";

  return (
    <div
      className={cn(
        "flex items-center gap-12",
        align === "right" ? "flex-row-reverse text-right" : "flex-row text-left"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-3xl bg-surface/60 backdrop-blur-sm border shadow-2xl",
          isLive
            ? "h-72 w-72 border-accent/30 shadow-[0_0_80px_-20px_rgba(238,73,92,0.4)]"
            : "h-64 w-64 border-line/20"
        )}
      >
        {logo ? (
          <Image
            src={logo}
            alt=""
            fill
            sizes="300px"
            className="object-contain p-12"
            priority
          />
        ) : (
          <span
            className="font-mono text-9xl font-black uppercase text-subtle/40"
            aria-hidden="true"
          >
            {isUnconfirmed ? "TBC" : name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Team name */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "display leading-[1.1] break-words",
            isLive
              ? "text-[120px] font-black text-ink drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              : "text-[100px] font-bold text-ink/90"
          )}
          title={name}
        >
          {name}
        </p>
      </div>
    </div>
  );
}
