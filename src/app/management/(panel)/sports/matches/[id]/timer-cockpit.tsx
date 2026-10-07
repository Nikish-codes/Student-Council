"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Play, Pause, RotateCcw, Clock, FastForward } from "lucide-react";
import { updateMatchTimer } from "../actions";
import { cn } from "@/lib/utils";
import type { SportMatchTimer } from "@/lib/schemas";

export function TimerCockpit({
  matchId,
  initialTimer,
}: {
  matchId: number;
  initialTimer?: SportMatchTimer;
}) {
  const [timer, setTimer] = useState<SportMatchTimer>(
    initialTimer || {
      running: false,
      startTime: null,
      elapsedMs: 0,
      matchDuration: 90, // Defaults to 90
      stoppageTime: 0,
    }
  );

  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [displayMs, setDisplayMs] = useState(timer.elapsedMs);
  
  const [editMins, setEditMins] = useState("");
  const [editSecs, setEditSecs] = useState("00");

  const hasAutoPaused = useRef(false);

  // Sync state if initialTimer changes from polling or external save
  useEffect(() => {
    if (initialTimer) {
      setTimer(initialTimer);
    }
  }, [initialTimer]);

  const saveTimer = (newTimer: SportMatchTimer) => {
    setTimer(newTimer);
    setFeedback("Syncing...");
    startTransition(async () => {
      await updateMatchTimer(matchId, newTimer);
      setFeedback("Synced");
      setTimeout(() => setFeedback(""), 2000);
    });
  };

  // Render loop to show the current ticking time to the admin
  useEffect(() => {
    let frame: number;
    const update = () => {
      let currentMs = timer.elapsedMs;
      
      if (timer.running && timer.startTime) {
        currentMs = Date.now() - timer.startTime + timer.elapsedMs;
        
        // Auto-pause at halftime!
        const halfTimeMs = ((timer.matchDuration || 90) / 2) * 60000;
        if (timer.elapsedMs < halfTimeMs && currentMs >= halfTimeMs && !hasAutoPaused.current) {
            hasAutoPaused.current = true;
            saveTimer({
              ...timer,
              running: false,
              startTime: null,
              elapsedMs: halfTimeMs,
            });
            currentMs = halfTimeMs;
        }
      } else {
        hasAutoPaused.current = false;
      }
      
      setDisplayMs(currentMs);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [timer]);


  const toggleRunning = () => {
    if (timer.running) {
      // Pause
      const newElapsed = Date.now() - (timer.startTime || Date.now()) + timer.elapsedMs;
      saveTimer({
        ...timer,
        running: false,
        startTime: null,
        elapsedMs: newElapsed,
      });
    } else {
      // Start
      saveTimer({
        ...timer,
        running: true,
        startTime: Date.now(),
      });
    }
  };

  const resetTimer = () => {
    if (confirm("Reset the timer to 00:00?")) {
      saveTimer({
        ...timer,
        running: false,
        startTime: null,
        elapsedMs: 0,
        stoppageTime: 0,
      });
    }
  };

  const setCustomTime = () => {
    const m = parseInt(editMins);
    const s = parseInt(editSecs) || 0;
    if (isNaN(m)) return;
    
    const newElapsed = (m * 60 + s) * 1000;
    
    if (timer.running) {
      saveTimer({
        ...timer,
        startTime: Date.now(),
        elapsedMs: newElapsed,
      });
    } else {
      saveTimer({
        ...timer,
        startTime: null,
        elapsedMs: newElapsed,
      });
    }
    
    setEditMins("");
    setEditSecs("00");
  };

  const currentMins = Math.floor(displayMs / 60000);
  const currentSecs = Math.floor((displayMs % 60000) / 1000);

  const formatTime = (m: number, s: number) =>
    `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const isHalftime = currentMins === (timer.matchDuration || 90) / 2 && currentSecs === 0 && !timer.running;

  return (
    <div className="rounded-2xl border border-line/15 bg-surface p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-accent" />
          <h3 className="font-mono text-sm uppercase tracking-widest text-ink font-bold">
            Live Match Clock
          </h3>
        </div>
        {feedback && (
          <span className="font-mono text-xs text-accent animate-fade-in">
            ✓ {feedback}
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        {/* Main Clock */}
        <div className="flex flex-col items-center bg-bg rounded-xl border border-line/10 p-6 md:w-1/3 justify-center">
          {isHalftime && (
            <span className="mb-2 text-xs font-bold text-accent bg-accent/10 px-3 py-1 rounded-md tracking-widest uppercase">
              Halftime Reached
            </span>
          )}
          <div
            className={cn(
              "font-mono tabular-nums text-6xl md:text-7xl font-bold tracking-tighter mb-6",
              timer.running ? "text-accent" : "text-ink"
            )}
          >
            {formatTime(currentMins, currentSecs)}
          </div>
          
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              disabled={pending}
              onClick={toggleRunning}
              className={cn(
                "flex-1 inline-flex justify-center items-center gap-2 rounded-xl px-4 py-4 text-sm font-bold transition-colors disabled:opacity-50",
                timer.running
                  ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20"
                  : "bg-accent text-white hover:bg-accent/90"
              )}
            >
              {timer.running ? (
                <>
                  <Pause className="h-5 w-5 fill-current" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" /> {timer.elapsedMs === 0 ? "Start" : "Resume"}
                </>
              )}
            </button>
            <button
              type="button"
              disabled={pending || timer.running}
              onClick={resetTimer}
              className="grid h-14 w-14 place-items-center rounded-xl border border-line/15 bg-surface-2 text-muted hover:border-line/40 hover:text-ink disabled:opacity-30"
              title="Reset to 00:00"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 grid gap-4">
          
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Match Duration */}
            <div className="bg-surface-2 p-4 rounded-xl border border-line/10">
              <span className="text-xs text-subtle block mb-3 uppercase tracking-wider font-semibold">
                Total Match Length
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={timer.matchDuration || 90}
                  onChange={(e) => saveTimer({ ...timer, matchDuration: parseInt(e.target.value) || 90 })}
                  className="w-20 rounded-lg border border-line/15 bg-bg px-3 py-2 text-base font-mono font-bold text-ink focus:border-accent focus:outline-none"
                />
                <span className="text-sm text-muted font-medium">Minutes</span>
              </div>
            </div>

            {/* Stoppage Time */}
            <div className="bg-surface-2 p-4 rounded-xl border border-line/10">
              <span className="text-xs text-subtle block mb-3 uppercase tracking-wider font-semibold">
                Extra / Injury Time
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-accent w-10">
                  +{timer.stoppageTime || 0}
                </span>
                <button
                  type="button"
                  onClick={() => saveTimer({ ...timer, stoppageTime: (timer.stoppageTime || 0) + 1 })}
                  className="px-3 py-2 rounded-lg bg-bg border border-line/15 text-ink hover:border-accent text-sm font-semibold"
                >
                  +1 Min
                </button>
                <button
                  type="button"
                  onClick={() => saveTimer({ ...timer, stoppageTime: 0 })}
                  className="px-3 py-2 rounded-lg bg-bg border border-line/15 text-muted hover:text-rose-400 text-sm font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Edit Exact Time */}
          <div className="bg-surface-2 p-4 rounded-xl border border-line/10">
            <span className="text-xs text-subtle block mb-3 uppercase tracking-wider font-semibold">
              Set Custom Time (Jump)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Mins"
                value={editMins}
                onChange={(e) => setEditMins(e.target.value)}
                className="w-20 rounded-lg border border-line/15 bg-bg px-3 py-2 text-base font-mono text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-muted font-bold">:</span>
              <input
                type="number"
                placeholder="Secs"
                value={editSecs}
                onChange={(e) => setEditSecs(e.target.value)}
                className="w-20 rounded-lg border border-line/15 bg-bg px-3 py-2 text-base font-mono text-ink focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                disabled={pending || !editMins}
                onClick={setCustomTime}
                className="ml-2 inline-flex items-center gap-2 rounded-lg bg-bg border border-line/15 px-4 py-2 text-sm font-bold text-ink hover:border-accent transition-colors disabled:opacity-50"
              >
                <FastForward className="h-4 w-4" /> Jump to Time
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
