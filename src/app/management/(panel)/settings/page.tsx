import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { siteSettings as t } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { EditorShell } from "@/components/management/page-header";
import { TextField, SelectField, RepeaterField, SaveBar } from "@/components/management/fields";
import { saveSettings } from "./actions";

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London",
  "America/New_York", "America/Los_Angeles",
];

export default async function SettingsPage() {
  await requireRole("super_admin", "admin");
  const row = await db.query.siteSettings.findFirst({ where: eq(t.id, 1) });
  const campus = row?.campus ?? { name: "", coordinates: "", timezone: "Asia/Kolkata", timezoneAbbr: "IST" };

  return (
    <EditorShell kicker="Settings" title="Site settings" action={saveSettings}>
      <TextField name="siteName" label="Site name" required defaultValue={row?.siteName ?? "Woxsen Student Council"} />
      <TextField name="tagline" label="Tagline" hint="optional" defaultValue={row?.tagline} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="contactEmail" label="Contact email" defaultValue={row?.contactEmail} />
        <TextField name="grievanceMailTo" label="Grievance inbox" defaultValue={row?.grievanceMailTo ?? "council@woxsen.edu.in"} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="instagramUrl" label="Instagram URL" defaultValue={row?.instagramUrl} />
        <TextField name="linkedinUrl" label="LinkedIn URL" defaultValue={row?.linkedinUrl} />
      </div>

      <p className="kicker mt-4 text-subtle">Campus</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="campusName" label="Campus name" defaultValue={campus.name} />
        <TextField name="campusCoordinates" label="Coordinates" hint="display string" defaultValue={campus.coordinates} />
        <SelectField name="campusTimezone" label="Timezone" defaultValue={campus.timezone} options={TIMEZONES.map((z) => ({ value: z, label: z }))} />
        <TextField name="campusTimezoneAbbr" label="Timezone abbr" defaultValue={campus.timezoneAbbr} />
      </div>

      <RepeaterField
        name="grievanceCategories"
        label="Grievance categories"
        hint="to + cc route the Outlook deep-link per category"
        stacked
        columns={[
          { name: "value", label: "Value (slug)" },
          { name: "label", label: "Label" },
          { name: "to", label: "To email" },
          { name: "cc", label: "Cc (comma-separated)" },
        ]}
        defaultValue={(row?.grievanceCategories as { value: string; label: string; to?: string; cc?: string }[]) ?? []}
        template={{ value: "", label: "", to: "", cc: "" }}
      />
      <SaveBar label="Save settings" />
    </EditorShell>
  );
}
