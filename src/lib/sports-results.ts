import { z } from "zod";

export const competitionAwardSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().max(100),
  recipient: z.string().trim().max(160),
  team: z.string().trim().max(160).optional().default(""),
  photoId: z.number().int().positive().nullable().optional().default(null),
});
export type CompetitionAward = z.infer<typeof competitionAwardSchema>;

export const competitionResultSchema = z.object({
  participantType: z.enum(["teams", "people"]).default("teams"),
  winnerName: z.string().trim().max(160).default(""),
  runnerUpName: z.string().trim().max(160).default(""),
  summary: z.string().trim().max(2000).default(""),
  photoId: z.number().int().positive().nullable().default(null),
  runnerUpPhotoId: z.number().int().positive().nullable().default(null),
  galleryImageIds: z.array(z.number().int().positive()).default([]),
  awards: z.array(competitionAwardSchema).default([]),
});
export type CompetitionResult = z.infer<typeof competitionResultSchema>;

export function parseCompetitionResult(fd: FormData): CompetitionResult {
  const photo = String(fd.get("resultPhotoId") ?? "").trim();
  const runnerUpPhoto = String(fd.get("runnerUpPhotoId") ?? "").trim();

  let awards: CompetitionAward[] = [];
  try {
    const rawAwards = String(fd.get("awards") ?? "").trim();
    if (rawAwards) {
      const parsed = JSON.parse(rawAwards);
      if (Array.isArray(parsed)) {
        awards = parsed
          .filter(
            (a): a is Record<string, unknown> =>
              Boolean(a) &&
              typeof a === "object" &&
              Boolean(String(a.title || "").trim() || String(a.recipient || "").trim()),
          )
          .map((a) => ({
            id: String(a.id || Math.random().toString(36).slice(2)),
            title: String(a.title || "").trim(),
            recipient: String(a.recipient || "").trim(),
            team: String(a.team || "").trim(),
            photoId: a.photoId ? Number(a.photoId) : null,
          }));
      }
    }
  } catch {
    awards = [];
  }

  let galleryImageIds: number[] = [];
  try {
    const rawGallery = String(fd.get("galleryImageIds") ?? "").trim();
    if (rawGallery) {
      const parsed = JSON.parse(rawGallery);
      if (Array.isArray(parsed)) {
        galleryImageIds = parsed
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0);
      }
    }
  } catch {
    galleryImageIds = [];
  }

  return competitionResultSchema.parse({
    participantType: fd.get("participantType") ?? "teams",
    winnerName: fd.get("winnerName") ?? "",
    runnerUpName: fd.get("runnerUpName") ?? "",
    summary: fd.get("resultSummary") ?? "",
    photoId: photo ? Number(photo) : null,
    runnerUpPhotoId: runnerUpPhoto ? Number(runnerUpPhoto) : null,
    galleryImageIds,
    awards,
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
