import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SportsLiveScoreboard } from "@/components/sections/sports-live-scoreboard";
import { SportsMatchTimeline } from "@/components/sections/sports-match-timeline";
import { getSportsMatches } from "@/lib/content";
import { ArrowLeft } from "lucide-react";

export const revalidate = 10;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const matches = await getSportsMatches();
  const match = matches.find((m) => m.id === Number(id));
  if (!match) return { title: "Match Not Found" };
  const teamA = match.teamAName || "TBC";
  const teamB = match.teamBName || "TBC";
  return {
    title: `${teamA} vs ${teamB} | Match Centre`,
  };
}

export async function generateStaticParams() {
  const matches = await getSportsMatches();
  return matches.map((m) => ({ id: m.id.toString() }));
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matches = await getSportsMatches();
  const match = matches.find((m) => m.id === Number(id));

  if (!match) notFound();

  return (
    <div className="min-h-screen bg-bg pt-20">
      <div className="container max-w-4xl py-12">
        <Link
          href="/sports"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-subtle transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sports
        </Link>

        <div className="mb-8">
          <span className="kicker">Match Centre</span>
          <h1 className="display mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {match.teamAName || "TBC"} <span className="text-line/40 text-3xl mx-2">vs</span> {match.teamBName || "TBC"}
          </h1>
        </div>

        <SportsLiveScoreboard match={match} />

        {/* Live Feed / Post Match Info */}
        <div className="mt-8 space-y-8">
          <SportsMatchTimeline match={match} />

          {match.status === "scheduled" ? (
            <div className="rounded-2xl border border-line/10 bg-surface/30 p-8 text-center">
              <h2 className="display text-2xl text-ink">Upcoming Match</h2>
              <p className="mt-2 text-subtle max-w-md mx-auto">
                This match has not started yet. Check back during the scheduled time for live scores.
              </p>
            </div>
          ) : match.status === "finished" ? (
            <div className="rounded-2xl border border-line/10 bg-surface/30 p-8">
              <h2 className="display text-2xl text-ink mb-6">Match Summary</h2>
              <div className="prose prose-invert max-w-none">
                {match.postMatch.winnerName ? (
                  <p className="text-lg">
                    <strong className="text-accent">Winner:</strong> {match.postMatch.winnerName}
                    {match.postMatch.winnerTitle && ` (${match.postMatch.winnerTitle})`}
                  </p>
                ) : (
                  <p className="text-lg text-subtle">The match has concluded.</p>
                )}
              </div>
            </div>
          ) : match.status === "cancelled" ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <h2 className="display text-2xl text-red-400">Cancelled</h2>
              <p className="mt-2 text-subtle">This match has been cancelled.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
