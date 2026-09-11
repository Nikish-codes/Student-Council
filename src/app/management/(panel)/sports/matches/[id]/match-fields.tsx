"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/management/fields";

type Option = { value: string; label: string };

export function CompetitionFields({
  tournaments,
  leagues,
  initialTournamentId,
  initialLeagueId,
}: {
  tournaments: Option[];
  leagues: Option[];
  initialTournamentId: string;
  initialLeagueId: string;
}) {
  const [tournamentId, setTournamentId] = useState(initialTournamentId);
  const [leagueId, setLeagueId] = useState(initialLeagueId);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SelectField
        name="tournamentId"
        label="Tournament"
        hint={leagueId ? "Clear the league to choose one" : "optional"}
        value={tournamentId}
        disabled={Boolean(leagueId)}
        onChange={setTournamentId}
        options={[{ value: "", label: "— none —" }, ...tournaments]}
      />
      <SelectField
        name="leagueId"
        label="League"
        hint={tournamentId ? "Clear the tournament to choose one" : "optional"}
        value={leagueId}
        disabled={Boolean(tournamentId)}
        onChange={setLeagueId}
        options={[{ value: "", label: "— none —" }, ...leagues]}
      />
    </div>
  );
}

export function TeamFields({
  teams,
  initialTeamAId,
  initialTeamBId,
  initialType = "teams",
  initialAName,
  initialBName,
}: {
  teams: Option[];
  initialTeamAId: string;
  initialTeamBId: string;
  initialType?: "teams" | "people";
  initialAName?: string | null;
  initialBName?: string | null;
}) {
  const [type, setType] = useState(initialType);
  const [teamAId, setTeamAId] = useState(initialTeamAId);
  const [teamBId, setTeamBId] = useState(initialTeamBId);

  return (
    <div className="space-y-5">
      <SelectField
        name="participantType"
        label="Who is playing?"
        value={type}
        onChange={(v) => setType(v as "teams" | "people")}
        options={[
          { value: "teams", label: "Teams" },
          { value: "people", label: "Individual players" },
        ]}
      />
      <p className="text-sm text-muted">
        {type === "people"
          ? "Enter names directly. Players do not need profiles in People."
          : "Select existing teams or enter team names directly."}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {type === "teams" && (
          <>
            <SelectField
              name="teamAId"
              label="Team A"
              value={teamAId}
              onChange={setTeamAId}
              options={[
                { value: "", label: "Enter a team name below" },
                ...teams.map((team) => ({
                  ...team,
                  disabled: team.value === teamBId,
                })),
              ]}
            />
            <SelectField
              name="teamBId"
              label="Team B"
              value={teamBId}
              onChange={setTeamBId}
              options={[
                { value: "", label: "Enter a team name below" },
                ...teams.map((team) => ({
                  ...team,
                  disabled: team.value === teamAId,
                })),
              ]}
            />
          </>
        )}
        {(type === "people" || !teamAId) && (
          <TextField
            name="participantAName"
            label={type === "people" ? "Player A" : "Team A name"}
            required
            maxLength={160}
            defaultValue={initialAName}
          />
        )}
        {(type === "people" || !teamBId) && (
          <TextField
            name="participantBName"
            label={type === "people" ? "Player B" : "Team B name"}
            required
            maxLength={160}
            defaultValue={initialBName}
          />
        )}
      </div>
    </div>
  );
}
