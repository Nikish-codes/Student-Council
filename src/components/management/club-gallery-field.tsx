"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import type { ClubGalleryItem, ClubGallerySize } from "@/db/schema";
import { uploadMediaDirect } from "@/lib/direct-media-upload";
import {
  CLUB_GALLERY_UPLOAD_MAX_BYTES,
  CLUB_GALLERY_UPLOAD_MAX_LABEL,
  validateMediaUpload,
} from "@/lib/media-upload-policy";
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/management/fields";

const SIZE_OPTIONS: Array<{
  value: ClubGallerySize;
  label: string;
  description: string;
}> = [
  { value: "small", label: "Small", description: "Compact photo" },
  { value: "medium", label: "Medium", description: "Half row on desktop" },
  { value: "large", label: "Large", description: "Full row" },
];

type GalleryDraft = ClubGalleryItem & { size: ClubGallerySize };

function normaliseRows(rows: ClubGalleryItem[]): GalleryDraft[] {
  return rows.map((row) => ({
    ...row,
    size: row.size === "small" || row.size === "large" ? row.size : "medium",
  }));
}

export function ClubGalleryField({
  name,
  defaultValue,
  onValueChange,
}: {
  name: string;
  defaultValue?: ClubGalleryItem[] | null;
  onValueChange?: (value: ClubGalleryItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<GalleryDraft[]>(() =>
    normaliseRows(defaultValue ?? []),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commit = (updater: (current: GalleryDraft[]) => GalleryDraft[]) =>
    setRows((current) => {
      const next = updater(current);
      onValueChange?.(next);
      return next;
    });

  const update = (index: number, changes: Partial<GalleryDraft>) =>
    commit((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row,
      ),
    );

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    const rejected = files
      .map((file) => ({
        file,
        reason: validateMediaUpload(
          { filename: file.name, mimeType: file.type, size: file.size },
          "club-gallery",
        ),
      }))
      .filter((item) => item.reason);
    const accepted = files.filter(
      (file) => !rejected.some((item) => item.file === file),
    );

    if (rejected.length > 0) {
      setError(
        rejected.length === 1
          ? `${rejected[0].file.name}: ${rejected[0].reason}`
          : `${rejected.length} photos were skipped. Images must each be under ${CLUB_GALLERY_UPLOAD_MAX_LABEL}.`,
      );
    }
    if (accepted.length === 0) return;

    setUploading(true);
    const added: GalleryDraft[] = [];
    try {
      for (const file of accepted) {
        try {
          const media = await uploadMediaDirect(file, {
            alt: file.name,
            purpose: "club-gallery",
          });
          added.push({
            url: media.url,
            mediaId: media.id,
            caption: "",
            size: "medium",
          });
        } catch (uploadError) {
          setError(`${file.name}: ${(uploadError as Error).message}`);
        }
      }
      if (added.length > 0) commit((current) => [...current, ...added]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} readOnly />

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker text-subtle">Gallery photos</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Photo 1 is always the full-width highlight. Size changes width
            only; photos keep their complete original frame. Keep every image
            under{" "}
            <strong className="font-medium text-ink">
              {CLUB_GALLERY_UPLOAD_MAX_LABEL}
            </strong>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-medium text-bg transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-wait disabled:opacity-50"
        >
          {uploading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? "Uploading photos…" : "Add photos"}
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept="image/*"
          disabled={uploading}
          onChange={onUpload}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {uploading ? "Uploading selected gallery photos." : ""}
      </p>
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-300"
        >
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line/20 bg-surface-2/35 px-6 text-center transition-colors hover:border-line/40 hover:bg-surface-2/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <ImagePlus className="h-5 w-5 text-subtle" />
          <span className="text-sm font-medium text-ink">
            Choose gallery photos
          </span>
          <span className="text-xs text-muted">
            Multiple images are okay · max {CLUB_GALLERY_UPLOAD_MAX_LABEL} each
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <article
              key={`${row.mediaId ?? row.url}-${index}`}
              className="grid gap-4 rounded-xl bg-surface-2/55 p-3 sm:grid-cols-[8rem_minmax(0,1fr)]"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-line/5">
                {/* Gallery entries may include legacy external URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.url}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
                <span className="absolute bottom-2 left-2 rounded-md bg-bg/85 px-2 py-1 text-[10px] font-medium text-ink backdrop-blur-sm">
                  {index === 0 ? "featured" : row.size}
                </span>
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex items-start gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-muted">
                      Caption <span className="text-subtle">(optional)</span>
                    </span>
                    <input
                      value={row.caption ?? ""}
                      maxLength={160}
                      onChange={(event) =>
                        update(index, { caption: event.target.value })
                      }
                      placeholder="What is happening in this photo?"
                      className={cn(inputCls, "py-2")}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      commit((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    className="mt-5 rounded-lg p-2 text-subtle transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    aria-label={`Remove gallery photo ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {index === 0 ? (
                  <div>
                    <p className="text-[11px] font-medium text-muted">
                      Display size
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink">
                      Featured · photo 1 always appears largest and full width.
                    </p>
                  </div>
                ) : (
                  <fieldset>
                    <legend className="mb-1.5 text-[11px] font-medium text-muted">
                      Display size
                    </legend>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-bg/55 p-1">
                      {SIZE_OPTIONS.map((option) => {
                        const active = row.size === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={active}
                            title={option.description}
                            onClick={() =>
                              update(index, { size: option.value })
                            }
                            className={cn(
                              "min-h-9 rounded-lg px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                              active
                                ? "bg-ink font-medium text-bg"
                                : "text-muted hover:bg-line/5 hover:text-ink",
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-2 text-right text-[11px] text-subtle">
        {rows.length} {rows.length === 1 ? "photo" : "photos"} · each under{" "}
        {Math.round(CLUB_GALLERY_UPLOAD_MAX_BYTES / 1024 / 1024)} MB
      </p>
    </div>
  );
}
