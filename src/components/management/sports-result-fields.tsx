import { Fieldset } from "@/components/management/page-header";
import {
  MediaField,
  SelectField,
  TextAreaField,
  TextField,
  type MediaOption,
} from "@/components/management/fields";
import type { CompetitionResult } from "@/lib/sports-results";

export function SportsResultFields({
  result,
  media,
}: {
  result?: CompetitionResult | null;
  media: MediaOption[];
}) {
  return (
    <Fieldset
      title="Competition result"
      hint="Optional. Record a winner directly, even if you do not add any matches."
    >
      <SelectField
        name="participantType"
        label="Competition participants"
        defaultValue={result?.participantType ?? "teams"}
        options={[
          { value: "teams", label: "Teams" },
          { value: "people", label: "Individual players" },
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="winnerName"
          label="Winner"
          hint="Enter a player or team name"
          maxLength={160}
          defaultValue={result?.winnerName}
        />
        <TextField
          name="runnerUpName"
          label="Runner-up"
          hint="Optional"
          maxLength={160}
          defaultValue={result?.runnerUpName}
        />
      </div>
      <TextAreaField
        name="resultSummary"
        label="Result details"
        hint="Optional · final score, highlights, or awards"
        maxLength={2000}
        defaultValue={result?.summary}
      />
      <MediaField
        name="resultPhotoId"
        label="Result photo"
        hint="Optional · winner, team, or competition photo"
        defaultValue={result?.photoId ?? null}
        media={media}
      />
    </Fieldset>
  );
}
