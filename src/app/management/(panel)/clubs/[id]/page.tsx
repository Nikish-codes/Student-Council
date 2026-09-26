import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/db/client";
import {
  clubCategories as catT,
  clubs as t,
  users as usersT,
  type ClubActivity,
  type ClubGalleryItem,
  type ClubVideo,
} from "@/db/schema";
import { assertCanEditClub, requireClubManager } from "@/lib/rbac";
import { mediaOptions } from "@/lib/media-options";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import { ClubGalleryField } from "@/components/management/club-gallery-field";
import {
  TextField,
  TextAreaField,
  NumberField,
  TagsField,
  SelectField,
  MediaField,
  ColorField,
  RepeaterField,
  SaveBar,
} from "@/components/management/fields";
import { saveClub } from "../actions";

export default async function ClubEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubManager();
  const isLead = user.role === "club_lead";
  const { id } = await params;
  const isNew = id === "new";
  // Guards before any query: a club lead may only open their own club, and may
  // never open the "new club" form.
  assertCanEditClub(user, isNew ? null : Number(id));

  const [row, media, leads, cats] = await Promise.all([
    isNew ? null : db.query.clubs.findFirst({ where: eq(t.id, Number(id)) }),
    mediaOptions(),
    isLead
      ? Promise.resolve([])
      : db
          .select({ id: usersT.id, name: usersT.name })
          .from(usersT)
          .orderBy(asc(usersT.name)),
    db
      .select({ id: catT.id, label: catT.label })
      .from(catT)
      .orderBy(asc(catT.sortOrder), asc(catT.id)),
  ]);
  if (!isNew && !row) notFound();
  const action = saveClub.bind(null, isNew ? null : Number(id));

  return (
    <EditorShell
      kicker={isNew ? "New club" : "Edit club"}
      title={row?.name ?? "Club"}
      action={action}
    >
      {row ? (
        <Link
          href={`/clubs/${row.slug}`}
          target="_blank"
          className="-mt-2 inline-flex w-fit items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
        >
          View public page <ArrowUpRight className="h-3 w-3" />
        </Link>
      ) : null}

      <Fieldset title="Identity" hint="What shows on the /clubs card.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="name"
            label="Name"
            required
            maxLength={60}
            defaultValue={row?.name}
          />
          <TextField
            name="slug"
            label="Page address"
            hint="Generated from the club name if left empty"
            defaultValue={row?.slug}
            placeholder="e.g. photography-club"
          />
        </div>
        <MediaField
          name="logoId"
          label="Logo"
          hint="square · upload or pick"
          defaultValue={row?.logoId ?? null}
          media={media}
        />
        <TextAreaField
          name="blurb"
          label="Short club description"
          hint="One sentence shown on club lists and the signup page"
          required
          maxLength={200}
          rows={2}
          defaultValue={row?.blurb}
        />
        <SelectField
          name="categoryId"
          label="Category"
          hint="the heading this club sits under on /clubs"
          defaultValue={row?.categoryId ? String(row.categoryId) : ""}
          options={[
            { value: "", label: "— uncategorised —" },
            ...cats.map((c) => ({ value: String(c.id), label: c.label })),
          ]}
        />
        <TagsField
          name="tags"
          label="Tags"
          hint="keywords · not the category"
          defaultValue={row?.tags}
        />
      </Fieldset>

      <Fieldset
        title="Club page"
        hint="Everything below is optional. Sections you leave blank simply don't appear on the page — they're numbered from what you fill in, so there are never any gaps."
      >
        <TextField
          name="tagline"
          label="Tagline"
          hint="short line under the club name · e.g. “architecture, out loud.”"
          maxLength={80}
          defaultValue={row?.tagline}
        />
        <TextAreaField
          name="about"
          label="About"
          hint="what the club is and does · leave a blank line between paragraphs"
          rows={8}
          defaultValue={row?.about}
        />
        <MediaField
          name="coverId"
          label="Cover image"
          hint="wide banner · 2400×1000 recommended · anything from 3:2 to 5:1 shows uncropped"
          defaultValue={row?.coverId ?? null}
          media={media}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <ColorField
            name="accentColor"
            label="Accent colour"
            hint="tints this club's page · site red if blank"
            defaultValue={row?.accentColor}
          />
          <NumberField
            name="foundedYear"
            label="Founded"
            hint="optional"
            min={1900}
            max={2100}
            defaultValue={row?.foundedYear ?? null}
          />
          <NumberField
            name="members"
            label="Members"
            hint="optional · shows as a stat"
            min={0}
            defaultValue={row?.members ?? null}
          />
        </div>
      </Fieldset>

      <Fieldset
        title="Page copy & headlines"
        hint="Customize the scrolling marquee ticker and closing call-to-action on the club page."
      >
        <TextField
          name="tickerText"
          label="Scrolling ticker text"
          hint="Custom marquee text · defaults to club tags and flagship event"
          maxLength={180}
          defaultValue={
            (row?.pageSectionHeadings as Record<string, string> | null)?.ticker ?? ""
          }
        />
        <TextField
          name="closeHeading"
          label="Closing section heading"
          hint="Headline above the join button · defaults to club tagline or 'Join [Club]'"
          maxLength={120}
          defaultValue={
            (row?.pageSectionHeadings as Record<string, string> | null)?.close ?? ""
          }
        />
      </Fieldset>

      <Fieldset
        title="What we run"
        hint="The activities and events this club is known for."
      >
        <TextField
          name="flagshipEvent"
          label="Flagship event"
          hint="the one thing you're known for · e.g. “Annual Exhibition”"
          maxLength={80}
          defaultValue={row?.flagshipEvent}
        />
        <RepeaterField
          name="activities"
          label="Activities"
          hint="title + a sentence · rows without a title are dropped"
          columns={[
            { name: "title", label: "Activity" },
            {
              name: "description",
              label: "What happens",
              type: "textarea",
              grow: 2,
            },
          ]}
          defaultValue={(row?.activities as ClubActivity[]) ?? []}
          template={{ title: "", description: "" }}
        />
      </Fieldset>

      <Fieldset
        title="Media"
        hint="Videos load only when a visitor clicks play, so add as many as you like."
      >
        <RepeaterField
          name="videos"
          label="Videos"
          hint="paste any YouTube or Vimeo link · the first one shows large"
          columns={[
            { name: "url", label: "YouTube / Vimeo URL", grow: 2 },
            { name: "title", label: "Caption" },
          ]}
          defaultValue={(row?.videos as ClubVideo[]) ?? []}
          template={{ url: "", title: "" }}
        />
        <ClubGalleryField
          name="gallery"
          defaultValue={(row?.gallery as ClubGalleryItem[]) ?? []}
        />
      </Fieldset>

      <Fieldset title="Reach us" hint="Shown in the sidebar of the club page.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="joinUrl"
            label="Registration link"
            hint="Paste the club's form link. This is what the Apply now button opens on /clubsignup"
            defaultValue={row?.joinUrl}
          />
          <TextField
            name="instagramUrl"
            label="Instagram"
            hint="optional"
            defaultValue={row?.instagramUrl}
          />
          <TextField
            name="linkedinUrl"
            label="LinkedIn"
            hint="optional"
            defaultValue={row?.linkedinUrl}
          />
          <TextField
            name="websiteUrl"
            label="Website"
            hint="optional"
            defaultValue={row?.websiteUrl}
          />
          <TextField
            name="contactEmail"
            label="Contact email"
            hint="optional"
            defaultValue={row?.contactEmail}
          />
        </div>
        {isLead ? null : (
          <SelectField
            name="leadId"
            label="Club lead account"
            hint="the portal user who may edit this club"
            defaultValue={row?.leadId ? String(row.leadId) : ""}
            options={[
              { value: "", label: "— none —" },
              ...leads.map((l) => ({ value: String(l.id), label: l.name })),
            ]}
          />
        )}
      </Fieldset>

      <SaveBar />
    </EditorShell>
  );
}
