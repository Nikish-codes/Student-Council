import { db } from "@/db/client";
import { requireSportsManager } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import { TextField, MediaField, SaveBar } from "@/components/management/fields";
import { GalleryPicker } from "./gallery-picker";
import { saveSportsSettings } from "./actions";

export default async function SportsSettingsPage() {
  await requireSportsManager();
  const [config, media] = await Promise.all([
    db.query.sportsPageConfig.findFirst(),
    mediaOptions(),
  ]);

  const galleryIds = Array.isArray(config?.galleryImageIds)
    ? config!.galleryImageIds
    : [];
  const action = saveSportsSettings;

  return (
    <EditorShell
      kicker="Sports · Settings"
      title="Sports page settings"
      action={action}
    >
      <Fieldset
        title="Branding"
        hint="Academy logo + tagline shown on the /sports page."
      >
        <MediaField
          name="academyLogoId"
          label="Academy logo"
          hint="top-right of the sports page · square"
          defaultValue={config?.academyLogoId ?? null}
          media={media}
        />
        <TextField
          name="tagline"
          label="Tagline"
          hint="short line under the headline"
          maxLength={120}
          defaultValue={config?.tagline}
        />
      </Fieldset>

      <Fieldset
        title="Annual Calendar"
        hint="Schedule photo or poster shown when visitors click on the Calendar option (/sports/calendar)."
      >
        <MediaField
          name="calendarImageId"
          label="Calendar schedule photo"
          hint="high-resolution photo or poster of the sports calendar schedule"
          defaultValue={config?.calendarImageId ?? null}
          media={media}
        />
        <TextField
          name="calendarTitle"
          label="Calendar title"
          hint="optional headline shown above the calendar photo"
          maxLength={100}
          defaultValue={config?.calendarTitle ?? ""}
        />
        <TextField
          name="calendarDescription"
          label="Calendar description"
          hint="optional caption or notes below the headline"
          maxLength={240}
          defaultValue={config?.calendarDescription ?? ""}
        />
      </Fieldset>

      <Fieldset
        title="Gallery"
        hint="Images that scroll in the top marquee on /sports."
      >
        <GalleryPicker media={media} selectedIds={galleryIds} />
      </Fieldset>

      <SaveBar />
    </EditorShell>
  );
}
