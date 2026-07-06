"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { scanCheckIn, type ScanResult } from "./actions";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

const STYLE: Record<
  ScanResult["status"],
  { bg: string; icon: React.ReactNode }
> = {
  ok: {
    bg: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    icon: <CheckCircle2 className="h-10 w-10" />,
  },
  already: {
    bg: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    icon: <AlertTriangle className="h-10 w-10" />,
  },
  wrong_event: {
    bg: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    icon: <AlertTriangle className="h-10 w-10" />,
  },
  invalid: {
    bg: "border-red-500/40 bg-red-500/15 text-red-300",
    icon: <XCircle className="h-10 w-10" />,
  },
};

export function Scanner({
  eventId,
  initialCheckedIn,
  confirmed,
}: {
  eventId: number;
  initialCheckedIn: number;
  confirmed: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [result, setResult] = useState<ScanResult | null>(null);
  const [count, setCount] = useState(initialCheckedIn);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const handle = useCallback(
    async (text: string) => {
      const now = Date.now();
      if (busyRef.current) return;
      // Ignore the same payload re-scanned within 3s (camera fires many frames).
      if (text === lastRef.current.code && now - lastRef.current.at < 3000) return;
      lastRef.current = { code: text, at: now };
      busyRef.current = true;
      try {
        const res = await scanCheckIn(eventId, text);
        setResult(res);
        if (res.status === "ok") setCount((c) => c + 1);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(res.status === "ok" ? 90 : [40, 40, 40]);
        }
      } finally {
        setTimeout(() => {
          busyRef.current = false;
        }, 600);
      }
    },
    [eventId],
  );

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;

    async function start() {
      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
        .BarcodeDetector;
      try {
        if (Detector) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          if (stopped) return;
          const v = videoRef.current!;
          v.srcObject = stream;
          await v.play();
          const detector = new Detector({ formats: ["qr_code"] });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(v);
              if (codes[0]?.rawValue) await handle(codes[0].rawValue);
            } catch {
              /* transient decode error */
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } else {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          const reader = new BrowserQRCodeReader();
          zxingControls = await reader.decodeFromConstraints(
            { video: { facingMode: "environment" } },
            videoRef.current!,
            (res) => {
              if (res) handle(res.getText());
            },
          );
        }
      } catch {
        setCamError("Camera unavailable — use manual entry below.");
      }
    }
    start();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [handle]);

  const pct = confirmed > 0 ? Math.round((count / confirmed) * 100) : 0;
  const style = result ? STYLE[result.status] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">
          Checked in <span className="font-semibold text-ink">{count}</span>
          {confirmed > 0 ? <span className="text-subtle"> / {confirmed} ({pct}%)</span> : null}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line/15 bg-black">
        <video
          ref={videoRef}
          className="aspect-square w-full object-cover"
          muted
          playsInline
        />
        {/* Reticle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-2/3 w-2/3 rounded-2xl border-2 border-white/70" />
        </div>
        {camError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
            {camError}
          </div>
        ) : null}
      </div>

      {/* Result banner */}
      {result && style ? (
        <div className={`flex items-center gap-4 rounded-2xl border p-5 ${style.bg}`}>
          {style.icon}
          <div className="min-w-0">
            <p className="text-lg font-semibold">{result.message}</p>
            {result.name ? (
              <p className="truncate text-sm opacity-90">
                {result.name}
                {result.code ? (
                  <span className="ml-2 font-mono text-xs opacity-70">{result.code}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-line/15 bg-surface p-5 text-sm text-subtle">
          <Loader2 className="h-4 w-4 animate-spin" /> Point the camera at a ticket QR…
        </div>
      )}

      {/* Manual fallback */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) {
            handle(manual.trim());
            setManual("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="WSC-XXXX-XXXX (manual)"
          className="w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 font-mono text-sm uppercase text-ink outline-none focus:border-line/40"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg hover:opacity-90"
        >
          Check in
        </button>
      </form>
    </div>
  );
}
