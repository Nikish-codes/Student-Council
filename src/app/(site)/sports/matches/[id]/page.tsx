import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SportsMatchCard } from "@/components/sections/sports-match-card";
import { BigScreenDisplay } from "@/components/sections/big-screen-display";
import { getSportsMatches } from "@/lib/content";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const revalidate = 60;

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

export default async function MatchPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ display?: string }>;
}) {
  const { id } = await params;
  const { display } = await searchParams;
  const matches = await getSportsMatches();
  const match = matches.find((m) => m.id === Number(id));

  if (!match) notFound();

  // Big screen display mode for stadium/ground displays
  if (display === "true") {
    return <BigScreenDisplay match={match} />;
  }

  const isLive = match.status === "live";

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

        {/* We reuse the newly updated, highly prominent SportsMatchCard! */}
        <div className="pointer-events-none">
          <SportsMatchCard match={match} />
        </div>

        {/* Live Feed / Post Match Info */}
        <div className="mt-12 space-y-8">
          {match.events && match.events.length > 0 && (
            <div className="rounded-2xl border border-line/10 bg-surface/40 p-6 sm:p-8">
              <h2 className="display text-2xl text-ink mb-6">Match Events Timeline</h2>
              <div className="divide-y divide-line/10">
                {match.events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-4 py-3.5 text-sm">
                    <span className="font-mono text-xs font-semibold tabular-nums text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                      {ev.time}
                    </span>
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", ev.team === "a" ? "bg-sky-400" : "bg-rose-400")} />
                    <span className="font-semibold text-ink capitalize">{ev.type}</span>
                    {ev.description && <span className="text-subtle truncate">· {ev.description}</span>}
                    <span className="ml-auto font-mono text-xs text-muted shrink-0">
                      {ev.team === "a" ? (match.teamAName || "Side A") : (match.teamBName || "Side B")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLive ? (
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 mb-4">
                <span className="h-3 w-3 rounded-full bg-accent motion-safe:animate-pulse" />
              </div>
              <h2 className="display text-2xl text-accent">Live Coverage</h2>
              <p className="mt-2 text-subtle max-w-md mx-auto">
                Scores are updating in real-time. Stay tuned for live events and commentary if available.
              </p>
            </div>
          ) : match.status === "scheduled" ? (
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
          ) : (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <h2 className="display text-2xl text-red-400">Cancelled</h2>
              <p className="mt-2 text-subtle">This match has been cancelled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
