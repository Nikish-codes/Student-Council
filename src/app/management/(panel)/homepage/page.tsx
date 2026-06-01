import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { homepageConfig as t, events as eventsT, clubs as clubsT, recaps as recapsT } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { EditorShell } from "@/components/management/page-header";
import {
  TextField, TextAreaField, TagsField, SelectField, RepeaterField, MultiSelectField, SaveBar,
} from "@/components/management/fields";
import { saveHomepage } from "./actions";

export default async function HomepageComposer() {
  await requireRole("super_admin", "admin");
  const [row, events, clubs, recaps] = await Promise.all([
    db.query.homepageConfig.findFirst({ where: eq(t.id, 1) }),
    db.select({ id: eventsT.id, title: eventsT.title }).from(eventsT).orderBy(asc(eventsT.title)),
    db.select({ id: clubsT.id, name: clubsT.name }).from(clubsT).orderBy(asc(clubsT.name)),
    db.select({ id: recapsT.id, title: recapsT.title }).from(recapsT).orderBy(asc(recapsT.title)),
  ]);

  const hero = row?.hero;
  const closing = row?.closingCta;
  const statRows = (row?.stats ?? []).map((x) => ({
    value: String(x.value ?? ""), suffix: x.suffix ?? "", displayValue: x.displayValue ?? "", label: x.label ?? "",
  }));

  return (
    <EditorShell kicker="Homepage" title="Homepage composer" action={saveHomepage}>
      <p className="kicker text-subtle">Hero</p>
      <TextField name="heroKicker" label="Kicker" defaultValue={hero?.kicker} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="heroHeadline" label="Headline" defaultValue={hero?.headline} />
        <TextField name="heroSublineLead" label="Subline lead" defaultValue={hero?.sublineLead} />
      </div>
      <TagsField name="heroSublineWords" label="Rotating words" defaultValue={hero?.sublineWords} />
      <TextAreaField name="heroSubParagraph" label="Sub-paragraph" rows={2} defaultValue={hero?.subParagraph} />
      <TextField name="heroMarqueeText" label="Marquee text" defaultValue={hero?.marqueeText} />
      <RepeaterField
        name="heroCtas"
        label="Hero CTAs"
        hint="variant: primary | outline | ghost"
        columns={[{ name: "label", label: "Label" }, { name: "href", label: "Href" }, { name: "variant", label: "Variant" }]}
        defaultValue={(hero?.ctas as { label: string; href: string; variant: string }[]) ?? []}
        template={{ label: "", href: "", variant: "primary" }}
      />

      <p className="kicker mt-4 text-subtle">Stats</p>
      <TextField name="statsKicker" label="Stats kicker" defaultValue={row?.statsKicker} />
      <RepeaterField
        name="stats"
        label="Stats"
        columns={[{ name: "value", label: "Value", type: "number" }, { name: "suffix", label: "Suffix" }, { name: "displayValue", label: "Display" }, { name: "label", label: "Label" }]}
        defaultValue={statRows}
        template={{ value: "", suffix: "", displayValue: "", label: "" }}
      />

      <p className="kicker mt-4 text-subtle">Manifesto</p>
      <TextField name="manifestoKicker" label="Manifesto kicker" defaultValue={row?.manifestoKicker} />
      <RepeaterField
        name="manifestoLines"
        label="Manifesto lines"
        columns={[{ name: "lead", label: "Lead" }, { name: "tail", label: "Tail (italic)" }]}
        defaultValue={(row?.manifestoLines as { lead: string; tail: string }[]) ?? []}
        template={{ lead: "", tail: "" }}
      />
      <TextField name="manifestoFooter" label="Manifesto footer" defaultValue={row?.manifestoFooter} />

      <p className="kicker mt-4 text-subtle">Quick actions</p>
      <RepeaterField
        name="quickActions"
        label="Quick actions"
        hint="icon = lucide name"
        columns={[{ name: "icon", label: "Icon" }, { name: "title", label: "Title" }, { name: "body", label: "Body" }, { name: "href", label: "Href" }]}
        defaultValue={(row?.quickActions as { icon: string; title: string; body: string; href: string }[]) ?? []}
        template={{ icon: "Sparkles", title: "", body: "", href: "" }}
      />

      <p className="kicker mt-4 text-subtle">Closing CTA</p>
      <TextField name="closingKicker" label="Kicker" defaultValue={closing?.kicker} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="closingHeadlineLead" label="Headline lead" defaultValue={closing?.headlineLead} />
        <TextField name="closingHeadlineTail" label="Headline tail" defaultValue={closing?.headlineTail} />
      </div>
      <RepeaterField
        name="closingCtas"
        label="Closing CTAs"
        columns={[{ name: "label", label: "Label" }, { name: "href", label: "Href" }, { name: "variant", label: "Variant" }]}
        defaultValue={(closing?.ctas as { label: string; href: string; variant: string }[]) ?? []}
        template={{ label: "", href: "", variant: "primary" }}
      />

      <p className="kicker mt-4 text-subtle">Featured</p>
      <SelectField
        name="flagshipEventId"
        label="Flagship event"
        defaultValue={row?.flagshipEventId ? String(row.flagshipEventId) : ""}
        options={[{ value: "", label: "— none —" }, ...events.map((e) => ({ value: String(e.id), label: e.title }))]}
      />
      <MultiSelectField name="featuredClubIds" label="Featured clubs" options={clubs.map((c) => ({ id: c.id, label: c.name }))} defaultValue={row?.featuredClubIds ?? []} />
      <MultiSelectField name="vaultStoryIds" label="Vault stories" options={recaps.map((r) => ({ id: r.id, label: r.title }))} defaultValue={row?.vaultStoryIds ?? []} />
      <TextField name="tagline" label="Tagline" defaultValue={row?.tagline} />

      <SaveBar label="Save homepage" />
    </EditorShell>
  );
}
