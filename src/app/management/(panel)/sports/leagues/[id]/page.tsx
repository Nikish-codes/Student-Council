import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sportsLeagues as t, type SportStandingRow } from "@/db/schema";
import { requireSportsManager, canPublishSports } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import {
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  DateTimeField,
  CheckboxField,
  MediaField,
  RepeaterField,
  SaveBar,
} from "@/components/management/fields";
import {
  SPORT_TYPE_OPTIONS,
  SPORT_DIVISION_OPTIONS,
} from "@/lib/sports-options";
import { saveLeague } from "../actions";

export default async function LeagueEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSportsManager();
  const { id } = await params;
  const isNew = id === "new";

  const [row, media] = await Promise.all([
    isNew
      ? null
      : db.query.sportsLeagues.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
  ]);
  if (!isNew && !row) notFound();
  const action = saveLeague.bind(null, isNew ? null : Number(id));
  const publisher = canPublishSports(user.role);

  return (
    <EditorShell
      kicker={isNew ? "New league" : "Edit league"}
      title={row?.title ?? "New league"}
      action={action}
    >
      <Fieldset title="Basics" hint="What this league is and when it runs.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="title"
            label="Title"
            required
            maxLength={80}
            defaultValue={row?.title}
          />
          <TextField
            name="slug"
            label="Slug"
            hint="auto if blank"
            defaultValue={row?.slug}
            placeholder="auto from title"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField
            name="sport"
            label="Sport"
            defaultValue={row?.sport ?? "football"}
            options={SPORT_TYPE_OPTIONS}
          />
          <SelectField
            name="division"
            label="Division"
            defaultValue={row?.division ?? "open"}
            options={SPORT_DIVISION_OPTIONS}
          />
          <NumberField
            name="year"
            label="Year"
            required
            min={2020}
            max={2100}
            defaultValue={row?.year ?? new Date().getFullYear()}
          />
        </div>
        <TextField
          name="venue"
          label="Venue"
          hint="optional"
          defaultValue={row?.venue}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <DateTimeField
            name="startDate"
            label="Start date"
            hint="when the league begins"
            defaultValue={row?.startDate}
          />
          <DateTimeField
            name="endDate"
            label="End date"
            hint="when it wraps up"
            defaultValue={row?.endDate}
          />
        </div>
      </Fieldset>

      <Fieldset title="Page" hint="Banner, excerpt, and full description.">
        <MediaField
          name="bannerId"
          label="Banner image"
          hint="16:9 or wider recommended"
          defaultValue={row?.bannerId ?? null}
          media={media}
        />
        <TextField
          name="excerpt"
          label="Excerpt"
          hint="one line · shows on the list"
          maxLength={200}
          defaultValue={row?.excerpt}
        />
        <TextAreaField
          name="description"
          label="Description"
          hint="markdown · full detail on the league page"
          rows={6}
          defaultValue={row?.description}
        />
      </Fieldset>

      <Fieldset
        title="Standings"
        hint="League table — teams, played, won, lost, drawn, points."
      >
        <RepeaterField
          name="standings"
          label="Standings rows"
          hint="rows without a team name are dropped"
          stacked
          columns={[
            { name: "position", label: "Pos", type: "number" },
            { name: "teamName", label: "Team name" },
            { name: "played", label: "Played", type: "number" },
            { name: "won", label: "Won", type: "number" },
            { name: "lost", label: "Lost", type: "number" },
            { name: "drawn", label: "Drawn", type: "number" },
            { name: "points", label: "Points", type: "number" },
          ]}
          defaultValue={(row?.standings as SportStandingRow[]) ?? []}
          template={{
            position: 1,
            teamName: "",
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            points: 0,
          }}
        />
      </Fieldset>

      <Fieldset
        title="Publishing"
        hint="Status, featured flag, and visibility."
      >
        <SelectField
          name="status"
          label="Status"
          defaultValue={row?.status ?? "draft"}
          options={[
            { value: "draft", label: "Draft" },
            { value: "pending_review", label: "Submit for review" },
            ...(publisher
              ? [
                  { value: "published", label: "Published" },
                  { value: "archived", label: "Archived" },
                ]
              : []),
          ]}
        />
        <CheckboxField
          name="featured"
          label="Featured on the sports page"
          defaultChecked={row?.featured ?? false}
        />
      </Fieldset>

      <SaveBar label={publisher ? "Save" : "Save / submit for review"} />
    </EditorShell>
  );
}
