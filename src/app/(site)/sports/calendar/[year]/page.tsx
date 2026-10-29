import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SportsCalendar } from "../sports-calendar";

export const metadata: Metadata = {
  title: "Sports Calendar",
  description:
    "The Woxsen Sports Academy fixture calendar — matches and results, month by month.",
};

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export default async function CalendarYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) notFound();
  return <SportsCalendar requestedYear={year} />;
}
