import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchDisplay } from "@/components/display/match-display";
import { getLiveScoresEnabled, getSportsMatches } from "@/lib/content";

export const revalidate = 3600;

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
  const [matches, liveEnabled] = await Promise.all([
    getSportsMatches(),
    getLiveScoresEnabled(),
  ]);
  const match = matches.find((m) => m.id === Number(id));
  if (!match) notFound();
  if (!liveEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg p-8 text-center">
        <div>
          <p className="kicker">Live display</p>
          <h1 className="display mt-4 text-4xl sm:text-6xl">
            Live scores are turned off
          </h1>
          <p className="mt-4 text-muted">
            Switch them on in Sports → Settings to use the big screen.
          </p>
        </div>
      </main>
    );
  }
  return <MatchDisplay match={match} />;
}
