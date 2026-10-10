import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchDisplay } from "@/components/display/match-display";
import { getSportsMatches, getSportsPageConfig } from "@/lib/content";

export const revalidate = 5;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const matches = await getSportsMatches();
  const match = matches.find((m) => m.id === Number(id));
  if (!match) return { title: "Match Not Found" };
  return {
    title: `${match.teamAName || "TBC"} vs ${match.teamBName || "TBC"} | Live Display`,
  };
}

export async function generateStaticParams() {
  const matches = await getSportsMatches();
  return matches.map((m) => ({ id: m.id.toString() }));
}

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matches = await getSportsMatches();
  const match = matches.find((m) => m.id === Number(id));
  if (!match) notFound();
  const config = await getSportsPageConfig();
  return <MatchDisplay match={match} academyLogo={config.academyLogo} />;
}
