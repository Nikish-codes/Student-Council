"use client";

import { useEffect, useState } from "react";

import type { DbOvalMenuDay, OvalMealId } from "@/db/schema";
import { OvalDailyMenu } from "@/components/sections/oval-daily-menu";
import {
  getKolkataDate,
  getOvalMealPhasesFor,
  type OvalMealPhase,
} from "@/lib/oval-menu";

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
  const [tomorrow, setTomorrow] = useState(false);

  useEffect(() => {
    const update = () => {
      setPhases(getOvalMealPhasesFor(serviceDate));
      setTomorrow(serviceDate > getKolkataDate());
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [serviceDate]);

  return (
    <OvalDailyMenu
      serviceDate={serviceDate}
      day={day}
      phases={phases}
      tomorrow={tomorrow}
    />
  );
}
