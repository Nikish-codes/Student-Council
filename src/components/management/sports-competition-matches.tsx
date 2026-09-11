import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsMatches } from "@/db/schema";
import { Fieldset } from "@/components/management/page-header";

export async function SportsCompetitionMatches({
  id,
  kind,
  sport,
  participantType,
}: {
  id?: number;
  kind: "tournament" | "league";
  sport: string;
  participantType?: string;
}) {
  if (!id)
    return (
      <Fieldset
        title="Matches"
        hint="Save this competition first. Then add any matches you want to record, including just the final."
      >
        <p className="text-sm text-muted">
          You can also enter a winner above without adding matches.
        </p>
      </Fieldset>
    );
  const matches = await db.query.sportsMatches.findMany({
    where: eq(
      kind === "tournament"
        ? sportsMatches.tournamentId
        : sportsMatches.leagueId,
      id,
    ),
    with: { teamA: true, teamB: true },
    orderBy: asc(sportsMatches.id),
  });
  const query = new URLSearchParams({
    [kind + "Id"]: String(id),
    sport,
    participantType: participantType ?? "teams",
  });
  return (
    <Fieldset
      title="Matches"
      hint="Add Match 1, Match 2, a semi-final, or just the final. Save any competition changes before opening a match."
    >
      <div className="flex flex-wrap gap-4">
        <Link
          className="text-sm font-medium text-accent underline underline-offset-4"
          href={`/management/sports/matches/new?${query}`}
        >
          Add match
        </Link>
        <Link
          className="text-sm font-medium text-accent underline underline-offset-4"
          href={`/management/sports/matches/new?${query}&round=Final&status=finished`}
        >
          Add final result
        </Link>
      </div>
      {matches.length ? (
        <ul className="divide-y divide-line/10">
          {matches.map((m) => (
            <li key={m.id} className="py-3">
              <Link
                className="block text-sm underline underline-offset-4"
                href={`/management/sports/matches/${m.id}`}
              >
                {m.round ? `${m.round} · ` : ""}
                {m.participantAName || m.teamA?.name || "TBC"} vs{" "}
                {m.participantBName || m.teamB?.name || "TBC"}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {m.status}
                {m.scoreA != null && m.scoreB != null
                  ? ` · ${m.scoreA} : ${m.scoreB}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No matches added. A winner can still be published above.
        </p>
      )}
    </Fieldset>
  );
}
