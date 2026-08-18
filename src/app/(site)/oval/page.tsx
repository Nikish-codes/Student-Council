import type { Metadata } from "next";

import { OvalDailyMenu } from "@/components/sections/oval-daily-menu";
import { getApprovedOvalDay } from "@/lib/oval-data";
import { getOvalMealPhases, getOvalServiceDate } from "@/lib/oval-menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today's Oval Menu",
  description:
    "Today's approved breakfast, lunch, dinner, Jain lunch, and Jain dinner menu for the Oval mess at Woxsen University.",
};

export default async function OvalPage() {
  const now = new Date();
  const serviceDate = getOvalServiceDate(now);
  const day = await getApprovedOvalDay(serviceDate);
  return (
    <OvalDailyMenu
      serviceDate={serviceDate}
      day={day}
      phases={getOvalMealPhases(now)}
    />
  );
}
