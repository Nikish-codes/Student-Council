"use client";

import { useState } from "react";
import { SelectField } from "@/components/management/fields";

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
}: {
  teams: Option[];
  initialTeamAId: string;
  initialTeamBId: string;
}) {
  const [teamAId, setTeamAId] = useState(initialTeamAId);
  const [teamBId, setTeamBId] = useState(initialTeamBId);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SelectField
        name="teamAId"
        label="Team A"
        required
        value={teamAId}
        onChange={setTeamAId}
        options={[
          { value: "", label: "— select —" },
          ...teams.map((team) => ({
            ...team,
            disabled: team.value === teamBId,
          })),
        ]}
      />
      <SelectField
        name="teamBId"
        label="Team B"
        required
        value={teamBId}
        onChange={setTeamBId}
        options={[
          { value: "", label: "— select —" },
          ...teams.map((team) => ({
            ...team,
            disabled: team.value === teamAId,
          })),
        ]}
      />
    </div>
  );
}
