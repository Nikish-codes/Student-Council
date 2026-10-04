import Link from "next/link";
import Image from "next/image";
import { db } from "@/db/client";
import { requireSportsManager } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import { TextField, MediaField, SaveBar } from "@/components/management/fields";
import { saveSportsCalendarSettings } from "../settings/actions";

export default async function SportsCalendarManagementPage() {
  await requireSportsManager();
  const [config, media] = await Promise.all([
    db.query.sportsPageConfig.findFirst({
      with: { calendarImage: true },
    }),
    mediaOptions(),
  ]);

  const currentImageUrl = config?.calendarImage?.url || "";

  return (
    <EditorShell
      kicker="Sports · Calendar"
      title="Sports calendar schedule"
      action={saveSportsCalendarSettings}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line/15 bg-surface-2/40 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-ink">Public Sports Calendar</p>
          <p className="text-xs text-muted">
            This schedule photo is displayed to students when they click on the Calendar option.
          </p>
        </div>
        <Link
          href="/sports/calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line/20 bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink transition-colors hover:border-accent hover:text-accent"
        >
          View live calendar ↗
        </Link>
      </div>

      <Fieldset
        title="Schedule photo / poster"
        hint="Upload or select the official sports calendar graphic. Students will be able to view, zoom, and inspect it."
      >
        <MediaField
          name="calendarImageId"
          label="Calendar schedule photo"
          hint="high-resolution photo or poster (PNG, JPG, or WEBP)"
          defaultValue={config?.calendarImageId ?? null}
          media={media}
        />
      </Fieldset>

      <Fieldset
        title="Details (optional)"
        hint="Custom headline and notes displayed alongside the calendar schedule."
      >
        <TextField
          name="calendarTitle"
          label="Calendar title"
          hint="e.g. 2026–2027 Sports Calendar or Semester Schedule"
          maxLength={100}
          defaultValue={config?.calendarTitle ?? ""}
        />
        <TextField
          name="calendarDescription"
          label="Description / instructions"
          hint="e.g. Official schedule for all upcoming inter-house and league matches."
          maxLength={240}
          defaultValue={config?.calendarDescription ?? ""}
        />
      </Fieldset>

      {currentImageUrl ? (
        <Fieldset
          title="Current preview"
          hint="Preview of the schedule photo currently live on the sports calendar."
        >
          <div className="overflow-hidden rounded-xl border border-line/15 bg-surface-2 p-3">
            <div className="relative aspect-[16/10] max-h-[400px] w-full overflow-hidden rounded-lg bg-surface flex items-center justify-center">
              <Image
                src={currentImageUrl}
                alt="Current calendar schedule"
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 60vw, 100vw"
              />
            </div>
          </div>
        </Fieldset>
      ) : null}

      <SaveBar />
    </EditorShell>
  );
}
