"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Upload, X, Award } from "lucide-react";
import { uploadMediaDirect } from "@/lib/direct-media-upload";
import type { MediaOption } from "@/components/management/fields";
import type { CompetitionAward } from "@/lib/sports-results";

const QUICK_TITLES = [
  "MVP",
  "Best Player",
  "Player of the Tournament",
  "Best Batsman",
  "Best Bowler",
  "Top Scorer",
  "Best Defender",
  "Fair Play Award",
];

export function SportsAwardsEditor({
  initialAwards,
  media,
}: {
  initialAwards?: CompetitionAward[];
  media: MediaOption[];
}) {
  const [list, setList] = useState<CompetitionAward[]>(initialAwards ?? []);
  const [mediaList, setMediaList] = useState<MediaOption[]>(media);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const addAward = (presetTitle?: string) => {
    setList((cur) => [
      ...cur,
      {
        id: Math.random().toString(36).slice(2, 9),
        title: presetTitle ?? "",
        recipient: "",
        team: "",
        photoId: null,
      },
    ]);
  };

  const removeAward = (index: number) => {
    setList((cur) => cur.filter((_, i) => i !== index));
  };

  const updateAward = (
    index: number,
    field: keyof CompetitionAward,
    value: string | number | null,
  ) => {
    setList((cur) =>
      cur.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  async function handlePhotoUpload(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIndex(index);
    try {
      const uploaded = await uploadMediaDirect(file);
      setMediaList((m) => [uploaded, ...m]);
      updateAward(index, "photoId", uploaded.id);
    } catch (err) {
      alert((err as Error).message || "Failed to upload photo");
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker text-subtle">Category Awards & Best Players</span>
          <p className="text-xs text-muted">
            Add category honours such as MVP, Best Player, etc. with individual photos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => addAward()}
          className="inline-flex items-center gap-1.5 rounded-full border border-line/20 bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink transition-colors hover:border-line/40 hover:bg-surface-2"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Award</span>
        </button>
      </div>

      <input
        type="hidden"
        name="awards"
        value={JSON.stringify(list)}
        readOnly
      />

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line/20 bg-surface-2/20 p-6 text-center">
          <Award className="mx-auto h-8 w-8 text-subtle/50 mb-2" />
          <p className="text-sm font-medium text-ink">No individual awards added yet</p>
          <p className="mt-1 text-xs text-muted">
            Click &ldquo;Add Award&rdquo; or pick a common category below:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {QUICK_TITLES.map((title) => (
              <button
                key={title}
                type="button"
                onClick={() => addAward(title)}
                className="rounded-full border border-line/15 bg-surface px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
              >
                + {title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((award, i) => {
            const currentMedia = mediaList.find((m) => m.id === award.photoId);

            return (
              <div
                key={award.id ?? i}
                className="relative rounded-xl border border-line/15 bg-surface-2/40 p-4 transition-all hover:border-line/30"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-line/10">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/10 font-mono text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="font-medium text-sm text-ink">
                      {award.title || "Untitled Award"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAward(i)}
                    className="rounded-lg p-1 text-subtle transition-colors hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Remove award ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-subtle">
                      Award Title / Category *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MVP, Best Batsman"
                      value={award.title}
                      onChange={(e) => updateAward(i, "title", e.target.value)}
                      className="w-full rounded-lg border border-line/15 bg-surface px-3 py-2 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
                    />
                    <div className="mt-1 flex flex-wrap gap-1">
                      {["MVP", "Best Player", "Top Scorer"].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => updateAward(i, "title", q)}
                          className="text-[10px] text-muted hover:text-accent"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-subtle">
                      Recipient / Player Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Santhosh Kumar"
                      value={award.recipient}
                      onChange={(e) => updateAward(i, "recipient", e.target.value)}
                      className="w-full rounded-lg border border-line/15 bg-surface px-3 py-2 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-subtle">
                      Team (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shuttle Strikers"
                      value={award.team ?? ""}
                      onChange={(e) => updateAward(i, "team", e.target.value)}
                      className="w-full rounded-lg border border-line/15 bg-surface px-3 py-2 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Photo Selector */}
                <div className="mt-4 rounded-lg border border-line/10 bg-surface/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">
                      Player / Award Photo
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line/20 bg-surface px-2.5 py-1 text-xs text-ink hover:border-line/40">
                        <Upload className="h-3 w-3" />
                        <span>
                          {uploadingIndex === i ? "Uploading…" : "Upload photo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(i, e)}
                          className="sr-only"
                          disabled={uploadingIndex === i}
                        />
                      </label>
                      <select
                        aria-label="Pick existing media"
                        value={award.photoId ?? ""}
                        onChange={(e) =>
                          updateAward(
                            i,
                            "photoId",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="rounded-md border border-line/20 bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
                      >
                        <option value="">Or select from library…</option>
                        {mediaList.slice(0, 30).map((m) => (
                          <option key={m.id} value={m.id}>
                            #{m.id} {m.filename ?? "image"}
                          </option>
                        ))}
                      </select>
                      {award.photoId ? (
                        <button
                          type="button"
                          onClick={() => updateAward(i, "photoId", null)}
                          className="rounded p-1 text-subtle hover:text-ink"
                          title="Clear photo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {currentMedia ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line/20 bg-surface">
                        <Image
                          src={currentMedia.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <span className="text-xs text-muted truncate">
                        {currentMedia.filename || `Photo #${currentMedia.id}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
