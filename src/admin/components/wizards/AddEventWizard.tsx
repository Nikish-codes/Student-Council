"use client";

import * as React from "react";
import { WizardShell, type WizardStep } from "./WizardShell.tsx";
import {
  TextField,
  TextAreaField,
  SelectField,
  DateField,
  CheckboxField,
  MediaPickerField,
  RelationshipField,
} from "./WizardFields.tsx";

/**
 * The "Add an event" wizard. Walks through:
 *   1. Basics — title, slug, category, when
 *   2. Where — venue, end date, optional registration link
 *   3. Story — excerpt, banner image, optional video
 *   4. Publish — flagship? draft or publish now?
 *
 * On submit, POSTs to Payload's REST endpoint at /api/events using the
 * user's existing admin session cookie.
 */

type EventForm = {
  title: string;
  slug: string;
  category: string;
  date: string; // ISO local
  endDate: string;
  venue: string;
  registrationUrl: string;
  excerpt: string;
  banner: { id: string; url: string; alt?: string } | null;
  videoUrl: string;
  featured: boolean;
  club: { id: string; title: string } | null;
  publishStatus: "draft" | "published";
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function AddEventWizard() {
  const [form, setForm] = React.useState<EventForm>({
    title: "",
    slug: "",
    category: "cultural",
    date: "",
    endDate: "",
    venue: "",
    registrationUrl: "",
    excerpt: "",
    banner: null,
    videoUrl: "",
    featured: false,
    club: null,
    publishStatus: "draft",
  });
  const [slugDirty, setSlugDirty] = React.useState(false);

  // Auto-slug from title until the user manually edits the slug.
  React.useEffect(() => {
    if (!slugDirty) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  const update = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const steps: WizardStep[] = [
    {
      id: "basics",
      title: "Basics",
      blurb: "Name the event and tell us what kind it is and when.",
      validate: () => {
        if (!form.title.trim()) return "Please give the event a name.";
        if (form.title.length > 80) return "Title must be 80 characters or fewer.";
        if (!form.slug || !/^[a-z0-9-]+$/.test(form.slug))
          return "Slug must be lowercase letters, numbers, and dashes only.";
        if (!form.date) return "Pick a date and time.";
        return true;
      },
      content: (
        <>
          <TextField
            label="Event name"
            hint="The headline. Shows up on cards, the event page, and search."
            tip="Keep it punchy. 'Infinity Fest 2026' is better than 'The Annual Cultural Festival of 2026 Edition'."
            value={form.title}
            onChange={(v) => update("title", v)}
            maxLength={80}
            required
            placeholder="e.g. Infinity Fest 2026"
          />
          <TextField
            label="URL slug"
            hint="This becomes /events/<slug>. Lowercase, dashes only."
            tip="Auto-generated from the name. Only change it if you really need to — once published, the URL is hard to change."
            value={form.slug}
            onChange={(v) => {
              setSlugDirty(true);
              update("slug", slugify(v));
            }}
            required
            placeholder="infinity-fest-2026"
          />
          <SelectField
            label="Category"
            hint="What kind of event is it? Drives the colour and section it appears in."
            value={form.category}
            onChange={(v) => update("category", v)}
            required
            options={[
              { label: "Cultural", value: "cultural" },
              { label: "Tech", value: "tech" },
              { label: "Sports", value: "sports" },
              { label: "Academic", value: "academic" },
              { label: "Flagship (council-wide)", value: "flagship" },
            ]}
          />
          <DateField
            label="Starts at"
            hint="When does it kick off? Pick a date and time."
            tip="If it's an all-day event, just pick a time like 10:00 AM."
            value={form.date}
            onChange={(v) => update("date", v)}
            required
          />
        </>
      ),
    },
    {
      id: "where",
      title: "Where & when",
      blurb: "Where it's happening and (optionally) when it ends.",
      validate: () => {
        if (!form.venue.trim()) return "Please tell us where the event is.";
        if (form.venue.length > 120) return "Venue must be 120 characters or fewer.";
        if (form.registrationUrl && !/^https?:\/\//.test(form.registrationUrl)) {
          return "Registration URL must start with http:// or https://.";
        }
        return true;
      },
      content: (
        <>
          <TextField
            label="Venue"
            hint="Building, hall, or location. This shows on the event page."
            tip="Be specific: 'AB-1 Auditorium' is better than 'Campus'."
            value={form.venue}
            onChange={(v) => update("venue", v)}
            maxLength={120}
            required
            placeholder="e.g. Main Auditorium, AB-3"
          />
          <DateField
            label="Ends at (optional)"
            hint="Only fill this in for multi-day events or anything with a clear end time."
            value={form.endDate}
            onChange={(v) => update("endDate", v)}
          />
          <TextField
            label="Registration link (optional)"
            hint="External RSVP / sign-up URL. Adds a 'Register' button on the event page."
            tip="Google Forms, Luma, or any URL works. Leave blank if there's no registration."
            value={form.registrationUrl}
            onChange={(v) => update("registrationUrl", v)}
            type="url"
            placeholder="https://forms.gle/..."
          />
          <RelationshipField
            label="Hosting club (optional)"
            hint="Which club is running this? Links the event to their /clubs page."
            value={form.club}
            onChange={(v) => update("club", v)}
            collection="clubs"
            titleField="name"
            placeholder="Search clubs by name…"
          />
        </>
      ),
    },
    {
      id: "story",
      title: "Story & visuals",
      blurb: "The pitch and the imagery. This is what makes people show up.",
      validate: () => {
        if (!form.excerpt.trim()) return "Please write a short pitch.";
        if (form.excerpt.length > 240) return "Excerpt must be 240 characters or fewer.";
        if (!form.banner) return "Pick a banner image from the media library.";
        if (form.videoUrl && !/^https?:\/\//.test(form.videoUrl)) {
          return "Video URL must start with http:// or https://.";
        }
        return true;
      },
      content: (
        <>
          <TextAreaField
            label="Short pitch"
            hint="One or two sentences. Shown on listing cards and search results."
            tip="Sell it. Why should someone clear their evening for this? Lead with the headline act, prize, or theme."
            value={form.excerpt}
            onChange={(v) => update("excerpt", v)}
            maxLength={240}
            required
            rows={3}
            placeholder="e.g. Three days. Twelve venues. The council's biggest production of the year."
          />
          <MediaPickerField
            label="Banner image"
            hint="The hero image on cards and the event page. 16:9 looks best."
            tip="At least 1600×900 px. If you don't have one yet, open the media library in a new tab, upload there, then come back and pick it."
            value={form.banner}
            onChange={(v) => update("banner", v)}
            required
            mimePrefix="image/"
          />
          <TextField
            label="Trailer video (optional)"
            hint="YouTube, Vimeo, or direct .mp4 URL. Plays on the event page."
            tip="If you have a recap video from last year's edition, use it here — it dramatically lifts engagement."
            value={form.videoUrl}
            onChange={(v) => update("videoUrl", v)}
            type="url"
            placeholder="https://youtube.com/watch?v=..."
          />
        </>
      ),
    },
    {
      id: "publish",
      title: "Publish",
      blurb: "Last step. Decide if this goes live now or stays as a draft.",
      content: (
        <>
          <CheckboxField
            label="Mark as featured"
            hint="Featured events get a highlighted card on /events and may appear on the homepage."
            tip="Only flag the 2–3 best events of a session as featured. Featuring everything is the same as featuring nothing."
            checked={form.featured}
            onChange={(v) => update("featured", v)}
          />
          <SelectField
            label="Publish status"
            hint="Save as a draft to keep working on it, or publish to make it live on the site immediately."
            tip="When in doubt, save as draft. Drafts are invisible to everyone except admins. You can always come back and publish later."
            value={form.publishStatus}
            onChange={(v) => update("publishStatus", v as "draft" | "published")}
            options={[
              { label: "Save as draft (not yet live)", value: "draft" },
              { label: "Publish now (live immediately)", value: "published" },
            ]}
          />
        </>
      ),
    },
  ];

  const handleSubmit = async () => {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      slug: form.slug,
      category: form.category,
      date: new Date(form.date).toISOString(),
      venue: form.venue.trim(),
      excerpt: form.excerpt.trim(),
      banner: form.banner?.id,
      featured: form.featured,
      status: form.publishStatus,
      _status: form.publishStatus, // payload drafts plugin field
    };
    if (form.endDate) payload.endDate = new Date(form.endDate).toISOString();
    if (form.registrationUrl) payload.registrationUrl = form.registrationUrl;
    if (form.videoUrl) payload.videoUrl = form.videoUrl;
    if (form.club) payload.club = form.club.id;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data?.errors?.[0]?.message ||
          data?.message ||
          "Could not save the event.";
        return { ok: false as const, error: msg };
      }
      const newId = data?.doc?.id ?? data?.id;
      return {
        ok: true as const,
        viewHref: newId ? `/admin/collections/events/${newId}` : undefined,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Network error.",
      };
    }
  };

  return (
    <WizardShell
      title="Add an event"
      intro="Four short steps. We'll save it as a draft by default — nothing goes live until you say so."
      steps={steps}
      onSubmit={handleSubmit}
      successTitle={
        form.publishStatus === "published"
          ? "Event published 🎉"
          : "Event saved as draft"
      }
      successBlurb={
        form.publishStatus === "published"
          ? "It's live on the site now. The /events page and homepage have been refreshed."
          : "It's saved but not visible to the public. Open it again any time to keep editing or publish it."
      }
    />
  );
}
