import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SportsHub } from "../../sports-hub";

export const metadata: Metadata = {
  title: "Sports Academy",
  description:
    "Woxsen Sports Academy — tournaments, leagues, matches, and live scores.",
};

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export default async function SportsYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) notFound();
  return <SportsHub requestedYear={year} />;
}
