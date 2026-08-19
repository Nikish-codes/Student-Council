"use client";

import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

import { ClubPageRenderer } from "@/app/club-lab/distortion/distortion-club-lab";
import { ClubGalleryField } from "@/components/management/club-gallery-field";
import { MediaField, type MediaOption } from "@/components/management/fields";
import type { ClubDetail } from "@/lib/schemas";
import type { ClubPageSnapshot } from "@/lib/revisions";
import { cn } from "@/lib/utils";
import { saveClubPageRevision } from "./actions";

const input = "mt-2 w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-line/40";
const themes = {
  stage: { background: "#0b0705", foreground: "#fff5e9", accent: "#ff5a1f" },
  zine: { background: "#f1ead8", foreground: "#17130f", accent: "#d93818" },
  clubhouse: { background: "#efffd8", foreground: "#17301e", accent: "#a92f18" },
} as const;

type RevisionInfo = {
  id: string;
  status: string;
  note: string | null;
  baseVersion: number;
} | null;

export function ClubPageEditor({
  club,
  initial,
  media,
  revision,
  baseVersion,
  saved,
}: {
  club: ClubDetail;
  initial: ClubPageSnapshot;
  media: MediaOption[];
  revision: RevisionInfo;
  baseVersion: number;
  saved: boolean;
}) {
  const [template, setTemplate] = useState(initial.pageTemplate);
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [blurb, setBlurb] = useState(initial.blurb);
  const [about, setAbout] = useState(initial.about ?? "");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [theme, setTheme] = useState(initial.pageTheme);
  const [visible, setVisible] = useState(new Set(initial.pageVisibleSections));

  const previewClub = useMemo<ClubDetail>(() => ({
    ...club,
    name,
    tagline: tagline || undefined,
    blurb,
    about: about || undefined,
    pageTemplate: template,
    pageTheme: theme,
    pageVisibleSections: [...visible],
    pageTypography: initial.pageTypography,
  }), [about, blurb, club, initial.pageTypography, name, tagline, template, theme, visible]);

  function chooseTemplate(value: "stage" | "zine" | "clubhouse") {
    setTemplate(value);
    setTheme({ ...themes[value], logoTreatment: theme.logoTreatment });
  }

  const editable = !revision || revision.status === "draft";
  return (
    <form action={saveClubPageRevision} className="space-y-8">
      <input type="hidden" name="clubId" value={club.id} />
      <input type="hidden" name="revisionId" value={editable ? revision?.id ?? "" : ""} />
      <input type="hidden" name="baseVersion" value={baseVersion} />
      <input type="hidden" name="themeBackground" value={theme.background} />
      <input type="hidden" name="themeForeground" value={theme.foreground} />
      <input type="hidden" name="themeAccent" value={theme.accent} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-subtle">Public page</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">Page editor</h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">
            Your draft is private. Submitting freezes this version for review while the approved page stays live.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="min-h-10 rounded-xl border border-line/15 px-4 text-sm font-medium hover:bg-line/5 disabled:opacity-50"
            type="submit"
            name="intent"
            value="save"
            disabled={!editable}
          >
            Save draft
          </button>
          <button
            className="min-h-10 rounded-xl bg-ink px-4 text-sm font-medium text-bg transition-transform active:scale-[0.98] disabled:opacity-50"
            type="submit"
            name="intent"
            value="submit"
            disabled={!editable}
          >
            Submit for review
          </button>
        </div>
      </header>

      {saved ? (
        <p role="status" className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Draft saved.
        </p>
      ) : null}
      {revision && revision.status !== "draft" ? (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This submission is {revision.status.replaceAll("_", " ")}. Submitted snapshots cannot be edited.
        </div>
      ) : null}
      {revision?.note ? (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <strong className="font-medium">Review note:</strong> {revision.note}
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)]">
        <div className="space-y-7">
          <EditorSection title="Choose a template" description="Structure stays consistent inside each template.">
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ["stage", "Stage", "Cinematic and performance-led"],
                ["zine", "Zine", "Editorial and archive-driven"],
                ["clubhouse", "Clubhouse", "Welcoming and people-first"],
              ] as const).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={template === value}
                  onClick={() => chooseTemplate(value)}
                  className={cn(
                    "min-h-28 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                    template === value ? "bg-ink text-bg" : "bg-surface hover:bg-line/5",
                  )}
                >
                  <span className="block font-medium">{label}</span>
                  <span className={cn("mt-2 block text-xs leading-5", template === value ? "text-bg/70" : "text-muted")}>{description}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="pageTemplate" value={template} />
          </EditorSection>

          <EditorSection title="Identity" description="The public name, introduction, and primary action.">
            <Field label="Club name">
              <input className={input} name="name" required value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Tagline" hint="Up to 180 characters">
              <input className={input} name="tagline" maxLength={180} value={tagline} onChange={(event) => setTagline(event.target.value)} />
            </Field>
            <Field label="Short introduction">
              <textarea className={input} name="blurb" required rows={3} value={blurb} onChange={(event) => setBlurb(event.target.value)} />
            </Field>
            <Field label="About">
              <textarea className={input} name="about" rows={7} value={about} onChange={(event) => setAbout(event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaField name="logoId" label="Logo" defaultValue={initial.logoId ?? null} media={media} />
              <MediaField name="coverId" label="Cover image" defaultValue={initial.coverId ?? null} media={media} />
            </div>
            <Field label="Join link">
              <input className={input} name="joinUrl" type="url" defaultValue={initial.joinUrl ?? ""} />
            </Field>
          </EditorSection>

          <EditorSection title="Color and type" description="Curated combinations keep text readable on every template.">
            <div className="flex flex-wrap gap-3">
              {Object.entries(themes).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme({ ...value, logoTreatment: theme.logoTreatment })}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-line/15 px-3 text-sm capitalize hover:bg-line/5"
                >
                  <span className="h-5 w-5 rounded-full border border-black/15" style={{ backgroundColor: value.accent }} />
                  {key}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Typography">
                <select className={input} name="pageTypography" defaultValue={initial.pageTypography}>
                  <option value="signal">Signal</option>
                  <option value="editorial">Editorial</option>
                  <option value="friendly">Friendly</option>
                </select>
              </Field>
              <Field label="Logo treatment">
                <select
                  className={input}
                  name="logoTreatment"
                  value={theme.logoTreatment}
                  onChange={(event) => setTheme({ ...theme, logoTreatment: event.target.value as ClubPageSnapshot["pageTheme"]["logoTreatment"] })}
                >
                  <option value="natural">Natural</option>
                  <option value="badge">Badge</option>
                  <option value="monochrome">Monochrome</option>
                </select>
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Sections" description="Choose what appears, then write the heading visitors see.">
            <div className="space-y-3">
              {([
                ["about", "About"], ["activities", "Activities"], ["videos", "Videos"],
                ["events", "Events"], ["gallery", "Gallery"], ["people", "People"],
              ] as const).map(([key, label]) => (
                <div key={key} className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-[auto_1fr] sm:items-center">
                  <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      name={`section_${key}`}
                      checked={visible.has(key)}
                      onChange={(event) => setVisible((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(key); else next.delete(key);
                        return next;
                      })}
                    />
                    {label}
                  </label>
                  <input
                    className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm outline-none focus:border-line/40"
                    name={`heading${key[0].toUpperCase()}${key.slice(1)}`}
                    defaultValue={initial.pageSectionHeadings[key] ?? label}
                    aria-label={`${label} section heading`}
                  />
                </div>
              ))}
            </div>
          </EditorSection>

          <EditorSection title="Content" description="Use one activity per line: title, a vertical bar, then its description.">
            <Field label="Activities">
              <textarea
                className={input}
                name="activities"
                rows={6}
                defaultValue={initial.activities.map((item) => `${item.title}${item.description ? ` | ${item.description}` : ""}`).join("\n")}
              />
            </Field>
            <Field label="Video links" hint="One YouTube or Vimeo URL per line">
              <textarea className={input} name="videos" rows={4} defaultValue={initial.videos.map((item) => item.url).join("\n")} />
            </Field>
            <ClubGalleryField name="gallery" defaultValue={initial.gallery} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Member count"><input className={input} name="members" type="number" min={0} defaultValue={initial.members ?? ""} /></Field>
              <Field label="Founded year"><input className={input} name="foundedYear" type="number" min={1900} max={2200} defaultValue={initial.foundedYear ?? ""} /></Field>
            </div>
            <Field label="Flagship event"><input className={input} name="flagshipEvent" defaultValue={initial.flagshipEvent ?? ""} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram"><input className={input} name="instagramUrl" type="url" defaultValue={initial.instagramUrl ?? ""} /></Field>
              <Field label="LinkedIn"><input className={input} name="linkedinUrl" type="url" defaultValue={initial.linkedinUrl ?? ""} /></Field>
              <Field label="Website"><input className={input} name="websiteUrl" type="url" defaultValue={initial.websiteUrl ?? ""} /></Field>
              <Field label="Contact email"><input className={input} name="contactEmail" type="email" defaultValue={initial.contactEmail ?? ""} /></Field>
            </div>
          </EditorSection>
        </div>

        <aside className="xl:sticky xl:top-24 xl:h-[calc(100dvh-7rem)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Live preview</p>
            <div className="flex rounded-xl bg-surface p-1">
              <PreviewButton active={device === "desktop"} onClick={() => setDevice("desktop")} label="Desktop"><Monitor className="h-4 w-4" /></PreviewButton>
              <PreviewButton active={device === "mobile"} onClick={() => setDevice("mobile")} label="Mobile"><Smartphone className="h-4 w-4" /></PreviewButton>
            </div>
          </div>
          <div className="h-[calc(100%-3.25rem)] overflow-hidden rounded-2xl bg-black/20 p-2">
            <div className={cn("mx-auto h-full overflow-hidden rounded-xl bg-white", device === "mobile" ? "max-w-[390px]" : "w-full")}>
              <div
                className="origin-top-left"
                style={{
                  width: device === "mobile" ? 390 : 1280,
                  transform: device === "mobile" ? "scale(0.78)" : "scale(0.48)",
                  transformOrigin: "top left",
                }}
              >
                <ClubPageRenderer template={template} club={previewClub} upcoming={[]} past={[]} leads={[]} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

function EditorSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-muted">
      <span>{label}</span>{hint ? <span className="ml-2 text-xs font-normal text-subtle">{hint}</span> : null}
      {children}
    </label>
  );
}

function PreviewButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} preview`}
      aria-pressed={active}
      className={cn("grid h-9 w-9 place-items-center rounded-lg", active ? "bg-ink text-bg" : "text-muted hover:text-ink")}
    >
      {children}
    </button>
  );
}
