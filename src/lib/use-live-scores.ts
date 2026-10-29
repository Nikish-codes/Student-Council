"use client";

import { useState, useEffect } from "react";
import type { SportsMatch } from "@/lib/content";

export type LiveScoreUpdate = {
  id: number;
  status: SportsMatch["status"];
  scoreA: number | null;
  scoreB: number | null;
  postMatch: SportsMatch["postMatch"];
  events?: SportsMatch["events"];
};

export const LIVE_SCORES_URL =
  process.env.NEXT_PUBLIC_LIVE_SCORES_URL || "/api/sports/scores";

const POLL_MS = 5000;

let cachedScores: LiveScoreUpdate[] | null = null;
let lastFetchTime = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(scores: LiveScoreUpdate[]) => void>();

function pollScores() {
  if (document.hidden) return;
  const now = Date.now();
  if (now - lastFetchTime < POLL_MS - 500) return;
  lastFetchTime = now;

  fetch(LIVE_SCORES_URL)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    })
    .then((data: LiveScoreUpdate[]) => {
      cachedScores = data;
      subscribers.forEach((cb) => cb(data));
    })
    .catch((err) => {
      console.error("[Live Scores] Polling error:", err);
    });
}

function onVisible() {
  if (!document.hidden) pollScores();
}

function startPolling() {
  if (timer) return;
  timer = setInterval(pollScores, POLL_MS);
  document.addEventListener("visibilitychange", onVisible);
}

function stopPolling() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisible);
}

export function useLiveMatch(initialMatch: SportsMatch): SportsMatch {
  const [match, setMatch] = useState<SportsMatch>(initialMatch);
  const tracked = Boolean(initialMatch.liveUpdates);

  useEffect(() => {
    if (!tracked) return;
    const handler = (scores: LiveScoreUpdate[]) => {
      const update = scores.find((s) => s.id === initialMatch.id);
      if (update) {
        setMatch((prev) => {
          if (
            prev.status === update.status &&
            prev.scoreA === update.scoreA &&
            prev.scoreB === update.scoreB &&
            JSON.stringify(prev.postMatch) === JSON.stringify(update.postMatch) &&
            JSON.stringify(prev.events) === JSON.stringify(update.events)
          ) {
            return prev;
          }
          return {
            ...prev,
            status: update.status,
            scoreA: update.scoreA ?? undefined,
            scoreB: update.scoreB ?? undefined,
            postMatch: update.postMatch,
            events: update.events ?? prev.events,
          };
        });
      }
    };

    subscribers.add(handler);
    startPolling();

    if (cachedScores) {
      handler(cachedScores);
    } else {
      pollScores();
    }

    return () => {
      subscribers.delete(handler);
      if (subscribers.size === 0) stopPolling();
    };
  }, [initialMatch.id, tracked]);

  return match;
}
