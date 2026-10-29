"use client";

import { useEffect, useState } from "react";

import type { DbOvalMenuDay, OvalMealId } from "@/db/schema";
import { OvalDailyMenu } from "@/components/sections/oval-daily-menu";
import { getOvalMealPhasesFor, type OvalMealPhase } from "@/lib/oval-menu";

export function OvalLiveMenu({
  serviceDate,
  day,
  initialPhases,
}: {
  serviceDate: string;
  day: DbOvalMenuDay | null;
  initialPhases: Record<OvalMealId, OvalMealPhase>;
}) {
  const [phases, setPhases] = useState(initialPhases);

  useEffect(() => {
    const update = () => setPhases(getOvalMealPhasesFor(serviceDate));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [serviceDate]);

  return <OvalDailyMenu serviceDate={serviceDate} day={day} phases={phases} />;
}
