"use client";

import * as React from "react";
import { WizardShell, type WizardStep } from "./WizardShell.tsx";
import { TextField, CheckboxField, DateField } from "./WizardFields.tsx";

/**
 * The "Post an announcement" wizard. Just two steps: write it, decide if
 * it's pinned. Lands instantly on the homepage ticker.
 */

type AnnouncementForm = {
  title: string;
  href: string;
  date: string;
  pinned: boolean;
};

function nowLocalDatetime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function PostAnnouncementWizard() {
  const [form, setForm] = React.useState<AnnouncementForm>({
    title: "",
    href: "",
    date: nowLocalDatetime(),
    pinned: false,
  });

  const update = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const steps: WizardStep[] = [
    {
      id: "write",
      title: "Write the announcement",
      blurb: "Short, scannable, one line. This scrolls in the homepage ticker.",
      validate: () => {
        if (!form.title.trim()) return "Please write the announcement.";
        if (form.title.length > 140) return "Keep it under 140 characters.";
        if (form.href && !(form.href.startsWith("/") || /^https?:\/\//.test(form.href))) {
          return "Link must start with / (for an internal page) or http(s):// (external).";
        }
        return true;
      },
      content: (
        <>
          <TextField
            label="Announcement"
            hint="The headline that scrolls. One sentence. Drop the period."
            tip="Lead with what changed and when. 'Mid-sems pushed to 12 Nov' beats 'A schedule update for mid-semester examinations'."
            value={form.title}
            onChange={(v) => update("title", v)}
            maxLength={140}
            required
            placeholder="e.g. Infinity Fest tickets now live"
          />
          <TextField
            label="Link (optional)"
            hint="Where should clicking the announcement send people?"
            tip="Use a path like /events/infinity-26 for internal links, or a full https:// URL for external ones. Leave blank if the headline is enough."
            value={form.href}
            onChange={(v) => update("href", v)}
            placeholder="/events/infinity-26"
          />
          <DateField
            label="Date"
            hint="Used for sorting. Default is right now."
            value={form.date}
            onChange={(v) => update("date", v)}
            required
          />
        </>
      ),
    },
    {
      id: "pin",
      title: "Pin it?",
      blurb:
        "Pinned announcements always appear first in the ticker until you unpin them.",
      content: (
        <CheckboxField
          label="Pin this announcement to the front"
          hint="Pinned items appear before any others, regardless of date."
          tip="Use sparingly — if everything's pinned, nothing's pinned. Two or three at a time is the sweet spot."
          checked={form.pinned}
          onChange={(v) => update("pinned", v)}
        />
      ),
    },
  ];

  const handleSubmit = async () => {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      date: new Date(form.date).toISOString(),
      pinned: form.pinned,
    };
    if (form.href) payload.href = form.href;

    try {
      const res = await fetch("/api/announcements", {
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
          "Could not post the announcement.";
        return { ok: false as const, error: msg };
      }
      const newId = data?.doc?.id ?? data?.id;
      return {
        ok: true as const,
        viewHref: newId ? `/admin/collections/announcements/${newId}` : undefined,
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
      title="Post an announcement"
      intro="Two quick steps. Announcements go live on the homepage ticker the moment you save."
      steps={steps}
      onSubmit={handleSubmit}
      successTitle="Announcement posted"
      successBlurb="It's now scrolling in the ticker on the homepage."
    />
  );
}
