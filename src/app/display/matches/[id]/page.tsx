import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BigScreenDisplay } from "@/components/sections/big-screen-display";
import { getSportsMatches, getSportsPageConfig } from "@/lib/content";

export const revalidate = 5; // Revalidate every 5 seconds for live matches

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const matches = await getSportsMatches();
  const match = matches.find((m) => m.id === Number(id));
  if (!match) return { title: "Match Not Found" };
  const teamA = match.teamAName || "TBC";
  const teamB = match.teamBName || "TBC";
  return {
    title: `${teamA} vs ${teamB} | Live Display`,
  };
}

export async function generateStaticParams() {
  const matches = await getSportsMatches();
  return matches.map((m) => ({ id: m.id.toString() }));
}

export default async function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matches = await getSportsMatches();
  const match = matches.find((m) => m.id === Number(id));

  if (!match) notFound();

  const config = await getSportsPageConfig();

  return <BigScreenDisplay match={match} academyLogo={config.academyLogo} />;
}
