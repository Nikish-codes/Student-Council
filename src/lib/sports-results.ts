import { z } from "zod";

export const competitionResultSchema = z.object({
  participantType: z.enum(["teams", "people"]).default("teams"),
  winnerName: z.string().trim().max(160).default(""),
  runnerUpName: z.string().trim().max(160).default(""),
  summary: z.string().trim().max(2000).default(""),
  photoId: z.number().int().positive().nullable().default(null),
});
export type CompetitionResult = z.infer<typeof competitionResultSchema>;

export function parseCompetitionResult(fd: FormData): CompetitionResult {
  const photo = String(fd.get("resultPhotoId") ?? "").trim();
  return competitionResultSchema.parse({
    participantType: fd.get("participantType") ?? "teams",
    winnerName: fd.get("winnerName") ?? "",
    runnerUpName: fd.get("runnerUpName") ?? "",
    summary: fd.get("resultSummary") ?? "",
    photoId: photo ? Number(photo) : null,
  });
}

export function parseMatchParticipants(fd: FormData) {
  const type = z
    .enum(["teams", "people"])
    .parse(fd.get("participantType") ?? "teams");
  const name = (key: string) =>
    z
      .string()
      .trim()
      .max(160)
      .parse(String(fd.get(key) ?? ""));
  const teamId = (key: string) => {
    const value = String(fd.get(key) ?? "").trim();
    return type === "people" || !value
      ? null
      : z.number().int().positive().parse(Number(value));
  };
  const teamAId = teamId("teamAId");
  const teamBId = teamId("teamBId");
  const participantAName = teamAId ? null : name("participantAName") || null;
  const participantBName = teamBId ? null : name("participantBName") || null;
  if ((!teamAId && !participantAName) || (!teamBId && !participantBName))
    throw new Error("Enter both participants or select both teams.");
  if (
    (teamAId && teamAId === teamBId) ||
    (participantAName &&
      participantBName &&
      participantAName.toLowerCase() === participantBName.toLowerCase())
  )
    throw new Error("Choose two different participants.");
  return {
    participantType: type,
    teamAId,
    teamBId,
    participantAName,
    participantBName,
  };
}
