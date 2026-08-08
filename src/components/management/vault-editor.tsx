"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VaultStoryConfig } from "@/lib/schemas";

const inputCls =
  "w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-line/40";

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
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="kicker text-subtle">{label}</span>
        {hint ? <span className="text-[11px] text-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

const MEDIA_KINDS: { value: VaultStoryConfig["mediaKind"]; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "text", label: "Text only" },
];

/**
 * Card-based editor for the homepage vault section. Each story is a card with
 * all its fields; the array is serialised to JSON in a hidden input named
 * `vaultStories`. Stories with an empty title are dropped on save.
 */
export function VaultEditor({
  defaultValue,
}: {
  defaultValue: VaultStoryConfig[];
}) {
  const [rows, setRows] = React.useState<VaultStoryConfig[]>(defaultValue);

  const blank = (): VaultStoryConfig => ({
    id: crypto.randomUUID(),
    kicker: "",
    title: "",
    year: "",
    line: "",
    mediaKind: "video",
    mediaSrc: "",
    posterSrc: "",
    href: "/events",
  });

  function update(id: string, key: keyof VaultStoryConfig, value: string) {
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  }

  function move(i: number, dir: -1 | 1) {
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  function add() {
    setRows((r) => [...r, blank()]);
  }

  return (
    <div>
      <input
        type="hidden"
        name="vaultStories"
        value={JSON.stringify(rows)}
        readOnly
      />
      <div className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="rounded-2xl border border-line/15 bg-surface-2/50 p-5"
          >
            {/* Card header: index + controls */}
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs text-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg p-1.5 text-subtle transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-subtle"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="rounded-lg p-1.5 text-subtle transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-subtle"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-lg p-1.5 text-subtle transition-colors hover:text-red-400"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Title + kicker + year */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input
                  className={inputCls}
                  value={row.title}
                  onChange={(e) => update(row.id, "title", e.target.value)}
                  placeholder="e.g. Infinity"
                />
              </Field>
              <Field label="Kicker" hint="section label">
                <input
                  className={inputCls}
                  value={row.kicker}
                  onChange={(e) => update(row.id, "kicker", e.target.value)}
                  placeholder="e.g. FLAGSHIP · CULTURAL FEST"
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Year" hint="e.g. '26">
                <input
                  className={inputCls}
                  value={row.year}
                  onChange={(e) => update(row.id, "year", e.target.value)}
                  placeholder="'26"
                />
              </Field>
              <Field label="Media kind">
                <select
                  className={inputCls}
                  value={row.mediaKind}
                  onChange={(e) =>
                    update(row.id, "mediaKind", e.target.value)
                  }
                >
                  {MEDIA_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Link" hint="where clicking goes">
                <input
                  className={inputCls}
                  value={row.href}
                  onChange={(e) => update(row.id, "href", e.target.value)}
                  placeholder="/events"
                />
              </Field>
            </div>

            {/* Media fields — shown/hidden by media kind */}
            {row.mediaKind === "video" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Video URL" hint="R2 / mp4 / YouTube">
                  <input
                    className={inputCls}
                    value={row.mediaSrc}
                    onChange={(e) => update(row.id, "mediaSrc", e.target.value)}
                    placeholder="https://… or /recap/….mp4"
                  />
                </Field>
                <Field label="Poster image" hint="shown before play">
                  <input
                    className={inputCls}
                    value={row.posterSrc}
                    onChange={(e) =>
                      update(row.id, "posterSrc", e.target.value)
                    }
                    placeholder="https://… or /recap/….jpg"
                  />
                </Field>
              </div>
            ) : row.mediaKind === "image" ? (
              <div className="mt-4">
                <Field label="Image URL">
                  <input
                    className={inputCls}
                    value={row.mediaSrc}
                    onChange={(e) => update(row.id, "mediaSrc", e.target.value)}
                    placeholder="https://… or /recap/….webp"
                  />
                </Field>
              </div>
            ) : null}

            {/* Description line */}
            <div className="mt-4">
              <Field label="Description" hint="one line shown over the media">
                <textarea
                  className={cn(inputCls, "resize-none")}
                  rows={2}
                  value={row.line}
                  onChange={(e) => update(row.id, "line", e.target.value)}
                  placeholder="e.g. Three days. Twelve venues. Unstructured infinity."
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-line/15 px-4 py-2 text-sm text-ink transition-colors hover:border-line/40"
      >
        <Plus className="h-4 w-4" /> Add story
      </button>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-subtle">
          No stories. The vault will fall back to auto-filled recaps from the
          Homepage editor.
        </p>
      ) : null}
    </div>
  );
}
