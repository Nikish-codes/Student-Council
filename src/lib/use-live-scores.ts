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

let cachedScores: LiveScoreUpdate[] | null = null;
let lastFetchTime = 0;
const subscribers = new Set<(scores: LiveScoreUpdate[]) => void>();

function pollScores() {
  const now = Date.now();
  if (now - lastFetchTime < 5000) return; // Deduplicate calls within 5s
  lastFetchTime = now;

  fetch("/api/sports/scores")
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

// Global polling loop
if (typeof window !== "undefined") {
  setInterval(() => {
    if (subscribers.size > 0) {
      pollScores();
    }
  }, 5000);
}

export function useLiveMatch(initialMatch: SportsMatch): SportsMatch {
  const [match, setMatch] = useState<SportsMatch>(initialMatch);

  useEffect(() => {
    const handler = (scores: LiveScoreUpdate[]) => {
      const update = scores.find((s) => s.id === initialMatch.id);
      if (update) {
        setMatch((prev) => {
          // Only update if something changed to avoid unnecessary re-renders
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
            events: (update.events as any) ?? prev.events,
          };
        });
      }
    };

    subscribers.add(handler);

    // Initial sync
    if (cachedScores) {
      handler(cachedScores);
    } else {
      pollScores();
    }

    return () => {
      subscribers.delete(handler);
    };
  }, [initialMatch.id]);

  return match;
}
