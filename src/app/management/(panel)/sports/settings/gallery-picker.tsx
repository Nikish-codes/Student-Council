"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Upload, Link as LinkIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MediaOption = { id: number; url: string; filename?: string | null };

export function GalleryPicker({
  media,
  selectedIds,
}: {
  media: MediaOption[];
  selectedIds: number[];
}) {
  const [list, setList] = useState<MediaOption[]>(media);
  const [selected, setSelected] = useState<number[]>(selectedIds);
  const [uploading, setUploading] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const added: MediaOption[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        added.push(json.media as MediaOption);
      }
      setList((l) => [...added, ...l]);
      setSelected((s) => [...s, ...added.map((m) => m.id)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onIngest(e: React.FormEvent) {
    e.preventDefault();
    const url = urlValue.trim();
    if (!url) return;
    setIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/media/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add URL");
      const m = json.media as MediaOption;
      setList((l) => [m, ...l]);
      setSelected((s) => [...s, m.id]);
      setPasting(false);
      setUrlValue("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="kicker text-subtle">Gallery images</span>
        <span className="text-xs text-subtle">{selected.length} selected</span>
      </div>
      <input
        type="hidden"
        name="galleryImageIds"
        value={JSON.stringify(selected)}
        readOnly
      />

      {/* Upload + paste controls */}
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line/15 px-3 py-1.5 text-xs text-ink hover:border-line/40">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload images"}
          <input
            type="file"
            hidden
            multiple
            onChange={onUpload}
            accept="image/*"
          />
        </label>
        <button
          type="button"
          onClick={() => setPasting((p) => !p)}
          className="inline-flex items-center gap-2 rounded-full border border-line/15 px-3 py-1.5 text-xs text-ink hover:border-line/40"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Paste URL
        </button>
      </div>

      {/* Paste URL form */}
      {pasting && (
        <form onSubmit={onIngest} className="mb-3 flex items-center gap-2">
          <input
            type="url"
            placeholder="https://res.cloudinary.com/…"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            className="w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-line/40"
            autoFocus
          />
          <button
            type="submit"
            disabled={ingesting || !urlValue.trim()}
            className="shrink-0 rounded-full border border-line/15 px-3 py-1.5 text-xs text-ink hover:border-line/40 disabled:opacity-50"
          >
            {ingesting ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPasting(false);
              setUrlValue("");
            }}
            className="shrink-0 rounded-lg p-2 text-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {/* Thumbnail grid — select/deselect gallery images */}
      <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-line/15 bg-surface-2 p-3 sm:grid-cols-4 lg:grid-cols-5">
        {list.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-lg border transition-colors",
              selected.includes(m.id)
                ? "border-ink ring-2 ring-ink/20"
                : "border-line/10 hover:border-line/40",
            )}
          >
            <Image src={m.url} alt="" fill className="object-cover" sizes="120px" />
            {selected.includes(m.id) && (
              <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-bg">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <p className="mt-2 text-xs text-subtle">
          No media yet. Upload images above or paste a URL to get started.
        </p>
      )}
    </div>
  );
}
