import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OvalLiveMenu } from "@/components/sections/oval-live-menu";
import { getApprovedOvalDay } from "@/lib/oval-data";
import { getOvalMealPhasesFor } from "@/lib/oval-menu";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Today's Oval Menu",
  description:
    "Today's approved breakfast, lunch, dinner, Jain lunch, and Jain dinner menu for the Oval mess at Woxsen University.",
};

export function generateStaticParams() {
  return [];
}

export default async function OvalDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const day = await getApprovedOvalDay(date);
  return (
    <OvalLiveMenu
      serviceDate={date}
      day={day}
      initialPhases={getOvalMealPhasesFor(date)}
    />
  );
}
