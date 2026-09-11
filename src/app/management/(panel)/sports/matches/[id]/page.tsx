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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSportsManager();
  const { id } = await params;
  const isNew = id === "new";
  const query = await searchParams;
  const preset = (key: string) =>
    isNew && typeof query[key] === "string" ? (query[key] as string) : "";

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
          : `${row?.participantAName || row?.teamA?.name || "Participant A"} vs ${row?.participantBName || row?.teamB?.name || "Participant B"}`
      }
      action={action}
    >
      <Fieldset title="Basics" hint="Sport, competition link, schedule.">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="sport"
            label="Sport"
            defaultValue={row?.sport ?? (preset("sport") || "football")}
            options={SPORT_TYPE_OPTIONS}
          />
          <SelectField
            name="status"
            label="Status"
            defaultValue={row?.status ?? (preset("status") || "scheduled")}
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
            row?.tournamentId
              ? String(row.tournamentId)
              : preset("tournamentId")
          }
          initialLeagueId={
            row?.leagueId ? String(row.leagueId) : preset("leagueId")
          }
        />
        <TextField
          name="round"
          label="Round"
          hint="e.g. Match 1, Match 2, Semi-final, Final"
          defaultValue={row?.round ?? preset("round")}
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

      <Fieldset title="Participants" hint="Teams or individual players.">
        <TeamFields
          teams={teams.map((team) => ({
            value: String(team.id),
            label: team.name,
          }))}
          initialTeamAId={row?.teamAId ? String(row.teamAId) : ""}
          initialTeamBId={row?.teamBId ? String(row.teamBId) : ""}
          initialType={
            row?.participantType ??
            (preset("participantType") === "people" ? "people" : "teams")
          }
          initialAName={row?.participantAName}
          initialBName={row?.participantBName}
        />
      </Fieldset>

      <Fieldset
        title="Score"
        hint="Set the final score or adjust the live score."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField
            name="scoreA"
            label="Side A score"
            min={0}
            defaultValue={row?.scoreA ?? null}
          />
          <NumberField
            name="scoreB"
            label="Side B score"
            min={0}
            defaultValue={row?.scoreB ?? null}
          />
        </div>
        {/* Hidden JSON inputs for events + postMatch — preserved on save */}
        <TextField
          name="winnerName"
          label="Match winner"
          hint="Optional · useful when no score is recorded"
          maxLength={160}
          defaultValue={row?.postMatch?.winnerName}
        />
        <TextField
          name="winnerTitle"
          label="Result details"
          hint="Optional · e.g. won in straight sets or walkover"
          maxLength={500}
          defaultValue={row?.postMatch?.winnerTitle}
        />
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
            teamAName={row?.participantAName || row?.teamA?.name || "Side A"}
            teamBName={row?.participantBName || row?.teamB?.name || "Side B"}
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
