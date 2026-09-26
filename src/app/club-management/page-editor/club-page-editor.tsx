"use client";

import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

import { ClubPageRenderer } from "@/components/clubs/club-page-renderer";
import { ClubGalleryField } from "@/components/management/club-gallery-field";
import { MediaField, type MediaOption } from "@/components/management/fields";
import type { ClubDetail, CouncilMember, EventItem } from "@/lib/schemas";
import type { ClubPageSnapshot } from "@/lib/revisions";
import { hasAccessibleClubTheme } from "@/lib/club-page-theme";
import { cn } from "@/lib/utils";
import { saveClubPageRevision } from "./actions";

const input =
  "mt-2 w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-line/40";
const STAGE_BACKGROUND = "#0b0705";
const STAGE_FOREGROUND = "#fff5e9";

function parseActivities(value: string) {
  return value
    .split("\n")
    .map((row) => row.split("|").map((part) => part.trim()))
    .filter(([title]) => Boolean(title))
    .map(([title, description]) => ({
      title,
      description: description || undefined,
    }));
}

function parseVideos(value: string) {
  return value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ url }));
}

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
  upcoming,
  past,
  leads,
}: {
  club: ClubDetail;
  initial: ClubPageSnapshot;
  media: MediaOption[];
  revision: RevisionInfo;
  baseVersion: number;
  saved: boolean;
  upcoming: EventItem[];
  past: EventItem[];
  leads: CouncilMember[];
}) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [blurb, setBlurb] = useState(initial.blurb);
  const [about, setAbout] = useState(initial.about ?? "");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [accent, setAccent] = useState(initial.pageTheme.accent);
  const [visible, setVisible] = useState(new Set(initial.pageVisibleSections));
  const [headings, setHeadings] = useState(initial.pageSectionHeadings);
  const [logoId, setLogoId] = useState(initial.logoId ?? null);
  const [coverId, setCoverId] = useState(initial.coverId ?? null);
  const [joinUrl, setJoinUrl] = useState(initial.joinUrl ?? "");
  const [members, setMembers] = useState(initial.members?.toString() ?? "");
  const [foundedYear, setFoundedYear] = useState(
    initial.foundedYear?.toString() ?? "",
  );
  const [flagshipEvent, setFlagshipEvent] = useState(
    initial.flagshipEvent ?? "",
  );
  const [activitiesText, setActivitiesText] = useState(() =>
    initial.activities
      .map(
        (item) =>
          `${item.title}${item.description ? ` | ${item.description}` : ""}`,
      )
      .join("\n"),
  );
  const [videosText, setVideosText] = useState(() =>
    initial.videos.map((item) => item.url).join("\n"),
  );
  const [gallery, setGallery] = useState(initial.gallery);
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? "");
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? "");

  const theme = useMemo(
    () => ({
      background: STAGE_BACKGROUND,
      foreground: STAGE_FOREGROUND,
      accent,
      logoTreatment: "natural" as const,
    }),
    [accent],
  );
  const previewClub = useMemo<ClubDetail>(
    () => ({
      ...club,
      name,
      tagline: tagline || undefined,
      blurb,
      about: about || undefined,
      logo:
        (logoId === initial.logoId
          ? club.logo
          : media.find((item) => item.id === logoId)?.url) ?? club.logo,
      cover:
        coverId === initial.coverId
          ? club.cover
          : media.find((item) => item.id === coverId)?.url,
      joinUrl: joinUrl || undefined,
      members: members ? Number(members) : undefined,
      foundedYear: foundedYear ? Number(foundedYear) : undefined,
      flagshipEvent: flagshipEvent || undefined,
      activities: parseActivities(activitiesText),
      videos: parseVideos(videosText),
      gallery,
      instagramUrl: instagramUrl || undefined,
      linkedinUrl: linkedinUrl || undefined,
      websiteUrl: websiteUrl || undefined,
      contactEmail: contactEmail || undefined,
      pageTemplate: "stage",
      pageTheme: theme,
      pageVisibleSections: [...visible],
      pageSectionHeadings: headings,
      pageTypography: "friendly",
    }),
    [
      about,
      activitiesText,
      blurb,
      club,
      contactEmail,
      coverId,
      flagshipEvent,
      foundedYear,
      gallery,
      headings,
      initial.coverId,
      initial.logoId,
      instagramUrl,
      joinUrl,
      linkedinUrl,
      logoId,
      media,
      members,
      name,
      tagline,
      theme,
      videosText,
      visible,
      websiteUrl,
    ],
  );

  const editable = !revision || revision.status === "draft";
  const accessibleTheme = hasAccessibleClubTheme(theme);
  return (
    <form action={saveClubPageRevision} className="space-y-8">
      <input type="hidden" name="clubId" value={club.id} />
      <input
        type="hidden"
        name="revisionId"
        value={editable ? (revision?.id ?? "") : ""}
      />
      <input type="hidden" name="baseVersion" value={baseVersion} />
      <input type="hidden" name="themeAccent" value={theme.accent} />
      <input type="hidden" name="pageTemplate" value="stage" />
      <input type="hidden" name="pageTypography" value="friendly" />
      <input type="hidden" name="logoTreatment" value="natural" />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-subtle">Public page</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">
            Page editor
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">
            Your draft is private. Submitting freezes this version for review
            while the approved page stays live.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="min-h-10 rounded-xl border border-line/15 px-4 text-sm font-medium hover:bg-line/5 disabled:opacity-50"
            type="submit"
            name="intent"
            value="save"
            disabled={!editable || !accessibleTheme}
          >
            Save draft
          </button>
          <button
            className="min-h-10 rounded-xl bg-ink px-4 text-sm font-medium text-bg transition-transform active:scale-[0.98] disabled:opacity-50"
            type="submit"
            name="intent"
            value="submit"
            disabled={!editable || !accessibleTheme}
          >
            Submit for review
          </button>
        </div>
      </header>

      {saved ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
        >
          Draft saved.
        </p>
      ) : null}
      {revision && revision.status !== "draft" ? (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This submission is {revision.status.replaceAll("_", " ")}. Submitted
          snapshots cannot be edited.
        </div>
      ) : null}
      {revision?.note ? (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <strong className="font-medium">Review note:</strong> {revision.note}
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)]">
        <div className="space-y-7">
          <EditorSection
            title="Identity"
            description="The public name, introduction, and primary action."
          >
            <Field label="Club name">
              <input
                className={input}
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Tagline" hint="Up to 180 characters">
              <input
                className={input}
                name="tagline"
                maxLength={180}
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
              />
            </Field>
            <Field label="Short club description">
              <p className="mb-2 text-sm text-muted">
                One sentence shown on club lists and the signup page.
              </p>
              <textarea
                className={input}
                name="blurb"
                required
                rows={3}
                value={blurb}
                onChange={(event) => setBlurb(event.target.value)}
              />
            </Field>
            <Field label="About">
              <textarea
                className={input}
                name="about"
                rows={7}
                value={about}
                onChange={(event) => setAbout(event.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaField
                name="logoId"
                label="Logo"
                defaultValue={initial.logoId ?? null}
                media={media}
                onValueChange={setLogoId}
              />
              <MediaField
                name="coverId"
                label="Club banner"
                defaultValue={initial.coverId ?? null}
                media={media}
                onValueChange={setCoverId}
              />
            </div>
            <Field label="Registration link">
              <p className="mb-2 text-sm text-muted">
                Paste the link students should open when they tap Sign up.
              </p>
              <input
                className={input}
                name="joinUrl"
                type="url"
                value={joinUrl}
                onChange={(event) => setJoinUrl(event.target.value)}
              />
            </Field>
          </EditorSection>

          <EditorSection
            title="Accent"
            description="Paste one six-digit hex color. Stage and Friendly are fixed for now."
          >
            <Field label="Accent color" hint="Format: #FF5A1F">
              <input
                className={input}
                name="accentDisplay"
                type="text"
                inputMode="text"
                pattern="#[0-9A-Fa-f]{6}"
                maxLength={7}
                placeholder="#FF5A1F"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                required
              />
            </Field>
            {!accessibleTheme ? (
              <p
                role="alert"
                className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
              >
                Choose an accent that stays visible against the Stage
                background.
              </p>
            ) : null}
          </EditorSection>

          <EditorSection
            title="Sections"
            description="Choose what appears, then write the heading visitors see."
          >
            <div className="space-y-3">
              {(
                [
                  ["about", "About"],
                  ["activities", "Activities"],
                  ["videos", "Videos"],
                  ["events", "Events"],
                  ["gallery", "Gallery"],
                  ["people", "People"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-[auto_1fr] sm:items-center"
                >
                  <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      name={`section_${key}`}
                      checked={visible.has(key)}
                      onChange={(event) =>
                        setVisible((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(key);
                          else next.delete(key);
                          return next;
                        })
                      }
                    />
                    {label}
                  </label>
                  <input
                    className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm outline-none focus:border-line/40"
                    name={`heading${key[0].toUpperCase()}${key.slice(1)}`}
                    value={headings[key] ?? label}
                    onChange={(event) =>
                      setHeadings((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    aria-label={`${label} section heading`}
                  />
                </div>
              ))}

              <div className="pt-2 border-t border-line/10 space-y-3">
                <div className="grid gap-1.5 rounded-xl bg-surface-2 p-3">
                  <label className="text-xs font-semibold text-ink">
                    Scrolling marquee ticker
                  </label>
                  <p className="text-xs text-muted">
                    Custom text running across the page banner · defaults to tags and flagship event
                  </p>
                  <input
                    className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm outline-none focus:border-line/40"
                    name="headingTicker"
                    placeholder="e.g. & Visual Arts / Product Design / Industrial Design / THE BIGGEST AUTO EXPO"
                    value={headings.ticker ?? ""}
                    onChange={(event) =>
                      setHeadings((current) => ({
                        ...current,
                        ticker: event.target.value,
                      }))
                    }
                    aria-label="Scrolling ticker text"
                  />
                </div>

                <div className="grid gap-1.5 rounded-xl bg-surface-2 p-3">
                  <label className="text-xs font-semibold text-ink">
                    Closing call-to-action headline
                  </label>
                  <p className="text-xs text-muted">
                    Headline above the join button · defaults to tagline or &ldquo;Join {name}&rdquo;
                  </p>
                  <input
                    className="rounded-lg border border-line/15 bg-bg px-3 py-2 text-sm outline-none focus:border-line/40"
                    name="headingClose"
                    placeholder="e.g. Find your craft. Build what matters."
                    value={headings.close ?? ""}
                    onChange={(event) =>
                      setHeadings((current) => ({
                        ...current,
                        close: event.target.value,
                      }))
                    }
                    aria-label="Closing call-to-action headline"
                  />
                </div>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            title="Content"
            description="Use one activity per line: title, a vertical bar, then its description."
          >
            <Field label="Activities">
              <textarea
                className={input}
                name="activities"
                rows={6}
                value={activitiesText}
                onChange={(event) => setActivitiesText(event.target.value)}
              />
            </Field>
            <Field label="Video links" hint="One YouTube or Vimeo URL per line">
              <textarea
                className={input}
                name="videos"
                rows={4}
                value={videosText}
                onChange={(event) => setVideosText(event.target.value)}
              />
            </Field>
            <ClubGalleryField
              name="gallery"
              defaultValue={initial.gallery}
              onValueChange={setGallery}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Member count">
                <input
                  className={input}
                  name="members"
                  type="number"
                  min={0}
                  value={members}
                  onChange={(event) => setMembers(event.target.value)}
                />
              </Field>
              <Field label="Founded year">
                <input
                  className={input}
                  name="foundedYear"
                  type="number"
                  min={1900}
                  max={2200}
                  value={foundedYear}
                  onChange={(event) => setFoundedYear(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Flagship event">
              <input
                className={input}
                name="flagshipEvent"
                value={flagshipEvent}
                onChange={(event) => setFlagshipEvent(event.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram">
                <input
                  className={input}
                  name="instagramUrl"
                  type="url"
                  value={instagramUrl}
                  onChange={(event) => setInstagramUrl(event.target.value)}
                />
              </Field>
              <Field label="LinkedIn">
                <input
                  className={input}
                  name="linkedinUrl"
                  type="url"
                  value={linkedinUrl}
                  onChange={(event) => setLinkedinUrl(event.target.value)}
                />
              </Field>
              <Field label="Website">
                <input
                  className={input}
                  name="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                />
              </Field>
              <Field label="Contact email">
                <input
                  className={input}
                  name="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </Field>
            </div>
          </EditorSection>
        </div>

        <aside className="xl:sticky xl:top-24 xl:h-[calc(100dvh-7rem)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Live preview</p>
            <div className="flex rounded-xl bg-surface p-1">
              <PreviewButton
                active={device === "desktop"}
                onClick={() => setDevice("desktop")}
                label="Desktop"
              >
                <Monitor className="h-4 w-4" />
              </PreviewButton>
              <PreviewButton
                active={device === "mobile"}
                onClick={() => setDevice("mobile")}
                label="Mobile"
              >
                <Smartphone className="h-4 w-4" />
              </PreviewButton>
            </div>
          </div>
          <div className="h-[calc(100%-3.25rem)] overflow-hidden rounded-2xl bg-black/20 p-2">
            <div
              className={cn(
                "mx-auto h-full overflow-hidden rounded-xl bg-white",
                device === "mobile" ? "max-w-[390px]" : "w-full",
              )}
            >
              <div
                className="origin-top-left"
                style={{
                  width: device === "mobile" ? 390 : 1280,
                  transform:
                    device === "mobile" ? "scale(0.78)" : "scale(0.48)",
                  transformOrigin: "top left",
                }}
              >
                <ClubPageRenderer
                  template="stage"
                  club={previewClub}
                  upcoming={upcoming}
                  past={past}
                  leads={leads}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-muted">
      <span>{label}</span>
      {hint ? (
        <span className="ml-2 text-xs font-normal text-subtle">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

function PreviewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} preview`}
      aria-pressed={active}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg",
        active ? "bg-ink text-bg" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
