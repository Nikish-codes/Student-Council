"use client";

import * as React from "react";
import type { CampusSettings } from "@/lib/schemas";

const FALLBACK: CampusSettings = {
  name: "Hyderabad",
  coordinates: "17.5°N 78.4°E",
  timezone: "Asia/Kolkata",
  timezoneAbbr: "IST",
};

export function HeroLiveBadge({ campus }: { campus?: CampusSettings }) {
  const c = campus ?? FALLBACK;
  const [time, setTime] = React.useState(() => format(new Date(), c.timezone));

  React.useEffect(() => {
    const id = setInterval(
      () => setTime(format(new Date(), c.timezone)),
      1000,
    );
    return () => clearInterval(id);
  }, [c.timezone]);

  return (
    <span className="kicker tabular-nums">
      {c.name} · {c.coordinates} · {time} {c.timezoneAbbr}
    </span>
  );
}

function format(d: Date, tz: string) {
  return d.toLocaleTimeString("en-IN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
