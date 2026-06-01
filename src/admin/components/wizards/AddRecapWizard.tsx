"use client";

import * as React from "react";
import { WizardShell, type WizardStep } from "./WizardShell.tsx";
import {
  TextField,
  TextAreaField,
  MediaPickerField,
  RelationshipField,
} from "./WizardFields.tsx";

/**
 * The "Add a recap" wizard. Recaps are the cinematic post-event stories
 * that power the rotating Vault on the homepage.
 *
 *   1. Which event — pick an existing event + headline copy
 *   2. Hero — required image, optional looping video
 *   3. Stats — up to four headline numbers
 */

type RecapStat = { label: string; value: string };

type RecapForm = {
  event: { id: string; title: string } | null;
  title: string;
  slug: string;
  kicker: string;
  blurb: string;
  heroMedia: { id: string; url: string; alt?: string } | null;
  heroVideoUrl: string;
  stats: RecapStat[];
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

export function AddRecapWizard() {
  const [form, setForm] = React.useState<RecapForm>({
    event: null,
    title: "",
    slug: "",
    kicker: "",
    blurb: "",
    heroMedia: null,
    heroVideoUrl: "",
    stats: [
      { label: "", value: "" },
      { label: "", value: "" },
    ],
  });
  const [slugDirty, setSlugDirty] = React.useState(false);

  React.useEffect(() => {
    if (!slugDirty) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  const update = <K extends keyof RecapForm>(key: K, value: RecapForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateStat = (idx: number, patch: Partial<RecapStat>) =>
    setForm((f) => ({
      ...f,
      stats: f.stats.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const addStat = () =>
    setForm((f) =>
      f.stats.length >= 4 ? f : { ...f, stats: [...f.stats, { label: "", value: "" }] },
    );

  const removeStat = (idx: number) =>
    setForm((f) => ({ ...f, stats: f.stats.filter((_, i) => i !== idx) }));

  const steps: WizardStep[] = [
    {
      id: "event",
      title: "Which event",
      blurb:
        "Recaps are always tied to a specific past event. Pick that event first.",
      validate: () => {
        if (!form.event) return "Pick the event this recap is for.";
        if (!form.title.trim()) return "Give the recap a title.";
        if (!form.slug || !/^[a-z0-9-]+$/.test(form.slug))
          return "Slug must be lowercase letters, numbers, and dashes.";
        return true;
      },
      content: (
        <>
          <RelationshipField
            label="Event"
            hint="Which event are we recapping? The recap links back to its page."
            tip="If the event isn't here yet, add it first using the 'Add an event' wizard, then come back."
            value={form.event}
            onChange={(v) => {
              update("event", v);
              if (v && !form.title) {
                update("title", `${v.title} — recap`);
              }
            }}
            collection="events"
            titleField="title"
            placeholder="Search events…"
            required
          />
          <TextField
            label="Recap title"
            hint="The headline on the recap page. Usually the event name plus something evocative."
            value={form.title}
            onChange={(v) => update("title", v)}
            maxLength={100}
            required
            placeholder="e.g. Infinity '26 — the aftermovie"
          />
          <TextField
            label="URL slug"
            hint="Auto-generated from the title. Only change if you really need to."
            value={form.slug}
            onChange={(v) => {
              setSlugDirty(true);
              update("slug", slugify(v));
            }}
            required
            placeholder="infinity-26-recap"
          />
          <TextField
            label="Kicker (optional)"
            hint="Tiny all-caps eyebrow line above the title."
            tip="Examples: 'FLAGSHIP · CULTURAL FEST', 'SPORTS DAY 2026'. Stays short."
            value={form.kicker}
            onChange={(v) => update("kicker", v)}
            maxLength={60}
            placeholder="FLAGSHIP · CULTURAL FEST"
          />
          <TextAreaField
            label="Blurb"
            hint="One or two lines summarising the recap. Shown on cards and in the Vault."
            tip="Past tense. Focus on what happened, not what's coming. 'Three days. Twelve venues. Twenty-thousand attendees.'"
            value={form.blurb}
            onChange={(v) => update("blurb", v)}
            maxLength={280}
            rows={3}
            placeholder="The biggest production of the year, in three sentences…"
          />
        </>
      ),
    },
    {
      id: "hero",
      title: "Hero media",
      blurb: "The big image or video at the top of the recap page.",
      validate: () => {
        if (!form.heroMedia) return "Pick a hero image.";
        if (form.heroVideoUrl && !/^https?:\/\//.test(form.heroVideoUrl)) {
          return "Video URL must start with http:// or https://.";
        }
        return true;
      },
      content: (
        <>
          <MediaPickerField
            label="Hero image"
            hint="Required. Used as the still poster and as a fallback when no video plays."
            tip="Pick the single most striking photo from the event. Wide is better than tall — 16:9 or wider."
            value={form.heroMedia}
            onChange={(v) => update("heroMedia", v)}
            required
            mimePrefix="image/"
          />
          <TextField
            label="Hero video URL (optional)"
            hint="A direct .mp4 or .webm URL — usually a recap aftermovie that auto-loops at the top."
            tip="YouTube/Vimeo don't work here (they can't auto-loop muted). Upload to the media library or paste a Cloudinary/R2 URL."
            value={form.heroVideoUrl}
            onChange={(v) => update("heroVideoUrl", v)}
            type="url"
            placeholder="https://...aftermovie.mp4"
          />
        </>
      ),
    },
    {
      id: "stats",
      title: "Stats",
      blurb:
        "Optional. Up to 4 headline numbers shown big on the recap page. Skip if you don't have them.",
      content: (
        <div className="wc-stats">
          {form.stats.map((s, i) => (
            <div key={i} className="wc-stats__row">
              <TextField
                label={`Stat ${i + 1} — value`}
                hint="The big number or short phrase."
                value={s.value}
                onChange={(v) => updateStat(i, { value: v })}
                maxLength={20}
                placeholder="20K+"
              />
              <TextField
                label={`Stat ${i + 1} — label`}
                hint="What that number measures."
                value={s.label}
                onChange={(v) => updateStat(i, { label: v })}
                maxLength={40}
                placeholder="Attendees"
              />
              {form.stats.length > 1 ? (
                <button
                  type="button"
                  className="wc-wiz__btn wc-wiz__btn--ghost wc-wiz__btn--sm"
                  onClick={() => removeStat(i)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {form.stats.length < 4 ? (
            <button
              type="button"
              className="wc-wiz__btn wc-wiz__btn--secondary wc-wiz__btn--sm"
              onClick={addStat}
            >
              + Add another stat
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const handleSubmit = async () => {
    const cleanStats = form.stats
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label && s.value);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      slug: form.slug,
      event: form.event?.id,
      heroMedia: form.heroMedia?.id,
      publishedAt: new Date().toISOString(),
      _status: "published",
    };
    if (form.kicker.trim()) payload.kicker = form.kicker.trim();
    if (form.blurb.trim()) payload.blurb = form.blurb.trim();
    if (form.heroVideoUrl.trim()) payload.heroVideoUrl = form.heroVideoUrl.trim();
    if (cleanStats.length > 0) payload.stats = cleanStats;

    try {
      const res = await fetch("/api/recaps", {
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
          "Could not save the recap.";
        return { ok: false as const, error: msg };
      }
      const newId = data?.doc?.id ?? data?.id;
      return {
        ok: true as const,
        viewHref: newId ? `/admin/collections/recaps/${newId}` : undefined,
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
      title="Add a recap"
      intro="Recaps power the rotating Vault on the homepage. Three short steps."
      steps={steps}
      onSubmit={handleSubmit}
      successTitle="Recap saved 🎬"
      successBlurb="It's live. The homepage Vault and the event page have been refreshed."
    />
  );
}
