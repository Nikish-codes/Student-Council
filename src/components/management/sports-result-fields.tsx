import { Fieldset } from "@/components/management/page-header";
import {
  MediaField,
  SelectField,
  TextAreaField,
  TextField,
  type MediaOption,
} from "@/components/management/fields";
import { GalleryPicker } from "@/app/management/(panel)/sports/settings/gallery-picker";
import { SportsAwardsEditor } from "@/components/management/sports-awards-editor";
import type { CompetitionResult } from "@/lib/sports-results";

export function SportsResultFields({
  result,
  media,
}: {
  result?: CompetitionResult | null;
  media: MediaOption[];
}) {
  return (
    <>
      <Fieldset
        title="Competition results & podium"
        hint="Record the champion and runner-up with ceremony photos and highlights."
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
            label="Champion / Winner"
            hint="Team or player name"
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
        <div className="grid gap-5 sm:grid-cols-2">
          <MediaField
            name="resultPhotoId"
            label="Champion photo"
            hint="Champions lifting trophy or team celebration"
            defaultValue={result?.photoId ?? null}
            media={media}
          />
          <MediaField
            name="runnerUpPhotoId"
            label="Runner-up photo"
            hint="Runner-up team or player photo"
            defaultValue={result?.runnerUpPhotoId ?? null}
            media={media}
          />
        </div>
        <TextAreaField
          name="resultSummary"
          label="Result details & recap"
          hint="Optional · final scores, match highlights, or commentary"
          maxLength={2000}
          defaultValue={result?.summary}
        />
      </Fieldset>

      <Fieldset
        title="Awards & Honours"
        hint="Recognize key performers like MVP, Best Player, Top Scorer with individual photos."
      >
        <SportsAwardsEditor initialAwards={result?.awards} media={media} />
      </Fieldset>

      <Fieldset
        title="League Gallery"
        hint="Upload and pick multiple highlight photos for this competition (match moments, celebrations, crowd)."
      >
        <GalleryPicker
          media={media}
          selectedIds={result?.galleryImageIds ?? []}
          name="galleryImageIds"
        />
      </Fieldset>
    </>
  );
}
