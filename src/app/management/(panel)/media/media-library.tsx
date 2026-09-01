"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Upload, Search, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { uploadMediaDirect } from "@/lib/direct-media-upload";
import { deleteMedia, updateMediaAlt } from "./actions";

type Item = {
  id: number;
  url: string;
  filename: string | null;
  mimeType: string | null;
  alt: string;
};

const PAGE_SIZE = 24;

export function MediaLibrary({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (m) =>
        (m.filename ?? "").toLowerCase().includes(q) ||
        m.alt.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const media = await uploadMediaDirect(file);
        setItems((l) => [{ ...media, alt: media.alt ?? "" }, ...l]);
      }
      toast.success(`Uploaded ${files.length} file(s)`);
      setPage(0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteMedia(id);
      setItems((l) => l.filter((m) => m.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Couldn't delete — you may not have permission.");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(m: Item) {
    setEditingId(m.id);
    setAltDraft(m.alt);
  }

  async function saveAlt(id: number) {
    try {
      await updateMediaAlt(id, altDraft);
      setItems((l) =>
        l.map((m) => (m.id === id ? { ...m, alt: altDraft.trim() } : m)),
      );
      toast.success("Alt text saved");
    } catch {
      toast.error("Couldn't save alt text.");
    }
    setEditingId(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="kicker text-subtle">Media library</p>
          <h1 className="display mt-1 text-3xl">{items.length} files</h1>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:bg-ink/90">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            hidden
            multiple
            disabled={uploading}
            onChange={onUpload}
            accept="image/*,video/*,application/pdf"
          />
        </label>
      </div>

      {/* Search */}
      <div className="relative mb-4 sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by filename or alt text…"
          className="w-full rounded-xl border border-line/15 bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-line/40"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {pageItems.map((m) => (
          <div
            key={m.id}
            className="group relative overflow-hidden rounded-xl border border-line/10 bg-line/5"
          >
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(m.url);
                toast.success("URL copied");
              }}
              className="block aspect-square w-full"
              title={m.filename ?? m.url}
            >
              {m.mimeType?.startsWith("image/") ? (
                <Image
                  src={m.url}
                  alt={m.alt || m.filename || ""}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-subtle">
                  {m.filename ?? m.mimeType}
                </span>
              )}
            </button>

            {/* Hover actions */}
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => startEdit(m)}
                className="rounded-lg bg-bg/80 p-1.5 text-subtle backdrop-blur-sm transition-colors hover:text-ink"
                title="Edit alt text"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={deletingId === m.id}
                onClick={() => {
                  if (confirm(`Delete "${m.filename ?? "this file"}"?`))
                    onDelete(m.id);
                }}
                className="rounded-lg bg-bg/80 p-1.5 text-subtle backdrop-blur-sm transition-colors hover:text-red-400 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Filename */}
            <div className="truncate px-2 py-1.5 text-[10px] text-subtle">
              {m.filename ?? "—"}
            </div>
          </div>
        ))}
        {pageItems.length === 0 ? (
          <p className="col-span-full py-12 text-center text-subtle">
            {search ? "No matches." : "No media yet."}
          </p>
        ) : null}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-between text-sm text-subtle">
          <p>
            {currentPage * PAGE_SIZE + 1}–
            {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-7 min-w-7 rounded-lg px-2 text-xs transition-colors ${
                  i === currentPage
                    ? "bg-ink text-bg font-medium"
                    : "hover:bg-line/5"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Alt text editor modal */}
      {editingId != null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
          onClick={() => setEditingId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line/10 bg-bg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-medium text-ink">Alt text</h3>
            <textarea
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Describe this image for screen readers…"
              className="w-full resize-none rounded-xl border border-line/15 bg-surface-2 p-3 text-sm text-ink outline-none focus:border-line/40"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingId(null)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={() => saveAlt(editingId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-ink/90"
              >
                <Check className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
