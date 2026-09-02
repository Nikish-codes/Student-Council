import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sportsMatches as t,
  sportsTeams as teamsT,
  sportsTournaments as tourT,
  sportsLeagues as leagueT,
  type SportMatchEvent,
  type SportPostMatch,
} from "@/db/schema";
import { requireSportsManager } from "@/lib/rbac";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import {
  TextField,
  NumberField,
  SelectField,
  DateTimeField,
  SaveBar,
} from "@/components/management/fields";
import { SPORT_TYPE_OPTIONS } from "@/lib/sports-options";
import { MatchCockpit } from "./match-cockpit";
import { CompetitionFields, TeamFields } from "./match-fields";
import { saveMatch } from "../actions";

export default async function MatchEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSportsManager();
  const { id } = await params;
  const isNew = id === "new";

  const [row, teams, tournaments, leagues] = await Promise.all([
    isNew
      ? null
      : db.query.sportsMatches.findFirst({
          where: eq(t.id, Number(id)),
          with: { teamA: true, teamB: true },
        }),
    db
      .select({ id: teamsT.id, name: teamsT.name })
      .from(teamsT)
      .orderBy(asc(teamsT.name)),
    db
      .select({ id: tourT.id, title: tourT.title })
      .from(tourT)
      .orderBy(desc(tourT.year)),
    db
      .select({ id: leagueT.id, title: leagueT.title })
      .from(leagueT)
      .orderBy(desc(leagueT.year)),
  ]);
  if (!isNew && !row) notFound();
  const action = saveMatch.bind(null, isNew ? null : Number(id));

  // Only show the live cockpit for existing matches that are football.
  const showCockpit =
    !isNew && row && row.sport === "football" && row.status !== "cancelled";

  return (
    <EditorShell
      kicker={isNew ? "New match" : "Edit match"}
      title={
        isNew
          ? "New match"
          : `${row?.teamA?.name ?? "Team A"} vs ${row?.teamB?.name ?? "Team B"}`
      }
      action={action}
    >
      <Fieldset title="Basics" hint="Sport, competition link, schedule.">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="sport"
            label="Sport"
            defaultValue={row?.sport ?? "football"}
            options={SPORT_TYPE_OPTIONS}
          />
          <SelectField
            name="status"
            label="Status"
            defaultValue={row?.status ?? "scheduled"}
            options={[
              { value: "scheduled", label: "Scheduled" },
              { value: "live", label: "Live" },
              { value: "finished", label: "Finished" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </div>
        <CompetitionFields
          tournaments={tournaments.map((t) => ({
            value: String(t.id),
            label: t.title,
          }))}
          leagues={leagues.map((l) => ({
            value: String(l.id),
            label: l.title,
          }))}
          initialTournamentId={
            row?.tournamentId ? String(row.tournamentId) : ""
          }
          initialLeagueId={row?.leagueId ? String(row.leagueId) : ""}
        />
        <TextField
          name="round"
          label="Round"
          hint="e.g. Quarterfinal, Matchday 3, Group A"
          defaultValue={row?.round}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <DateTimeField
            name="matchDate"
            label="Match date"
            defaultValue={row?.matchDate}
          />
          <TextField name="venue" label="Venue" defaultValue={row?.venue} />
        </div>
      </Fieldset>

      <Fieldset title="Teams" hint="The two teams playing.">
        <TeamFields
          teams={teams.map((team) => ({
            value: String(team.id),
            label: team.name,
          }))}
          initialTeamAId={row?.teamAId ? String(row.teamAId) : ""}
          initialTeamBId={row?.teamBId ? String(row.teamBId) : ""}
        />
      </Fieldset>

      <Fieldset
        title="Score"
        hint="Set the final score or adjust the live score."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField
            name="scoreA"
            label="Team A score"
            min={0}
            defaultValue={row?.scoreA ?? null}
          />
          <NumberField
            name="scoreB"
            label="Team B score"
            min={0}
            defaultValue={row?.scoreB ?? null}
          />
        </div>
        {/* Hidden JSON inputs for events + postMatch — preserved on save */}
        <input
          type="hidden"
          name="events"
          value={JSON.stringify((row?.events as SportMatchEvent[]) ?? [])}
          readOnly
        />
        <input
          type="hidden"
          name="postMatch"
          value={JSON.stringify((row?.postMatch as SportPostMatch) ?? {})}
          readOnly
        />
      </Fieldset>

      {showCockpit ? (
        <Fieldset
          title="Live scoring"
          hint="Real-time score + event feed for football."
        >
          <MatchCockpit
            matchId={Number(id)}
            teamAName={row?.teamA?.name ?? "Team A"}
            teamBName={row?.teamB?.name ?? "Team B"}
            scoreA={row?.scoreA ?? 0}
            scoreB={row?.scoreB ?? 0}
            status={row?.status ?? "scheduled"}
            events={(row?.events as SportMatchEvent[]) ?? []}
          />
        </Fieldset>
      ) : null}

      <SaveBar />
    </EditorShell>
  );
}
