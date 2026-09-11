import { describe, expect, it } from "vitest";
import {
  parseCompetitionResult,
  parseMatchParticipants,
} from "./sports-results";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

describe("sports result input", () => {
  it("accepts a winner without matches or a people profile", () => {
    expect(
      parseCompetitionResult(
        form({
          participantType: "people",
          winnerName: " Asha ",
          resultPhotoId: "7",
        }),
      ),
    ).toMatchObject({ winnerName: "Asha", photoId: 7 });
  });
  it("clears stale team references when choosing individual players", () => {
    expect(
      parseMatchParticipants(
        form({
          participantType: "people",
          teamAId: "1",
          teamBId: "2",
          participantAName: "Asha",
          participantBName: "Ravi",
        }),
      ),
    ).toMatchObject({ teamAId: null, teamBId: null, participantAName: "Asha" });
  });
  it("supports a saved team against a freely entered team", () => {
    expect(
      parseMatchParticipants(
        form({ teamAId: "3", participantBName: "Visitors" }),
      ),
    ).toMatchObject({ teamAId: 3, participantBName: "Visitors" });
  });
  it("rejects missing and duplicate opponents and invalid photo IDs", () => {
    expect(() =>
      parseMatchParticipants(form({ participantAName: "Asha" })),
    ).toThrow();
    expect(() =>
      parseMatchParticipants(form({ teamAId: "2", teamBId: "2" })),
    ).toThrow();
    expect(() =>
      parseMatchParticipants(
        form({ participantAName: "Asha", participantBName: " asha " }),
      ),
    ).toThrow();
    expect(() =>
      parseCompetitionResult(form({ resultPhotoId: "-1" })),
    ).toThrow();
  });
});
