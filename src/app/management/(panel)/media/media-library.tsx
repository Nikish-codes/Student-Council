"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { toast } from "sonner";

type Item = { id: number; url: string; filename: string | null; mimeType: string | null };

export function MediaLibrary({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [uploading, setUploading] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        setItems((l) => [json.media, ...l]);
      }
      toast.success(`Uploaded ${files.length} file(s)`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="kicker text-subtle">Media library</p>
          <h1 className="display mt-1 text-3xl">{items.length} files</h1>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:bg-ink/90">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" hidden multiple onChange={onUpload} accept="image/*,video/*,application/pdf" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(m.url);
              toast.success("URL copied");
            }}
            className="group relative aspect-square overflow-hidden rounded-xl border border-line/10 bg-line/5"
            title={m.filename ?? m.url}
          >
            {m.mimeType?.startsWith("image/") ? (
              <Image src={m.url} alt={m.filename ?? ""} fill className="object-cover" sizes="160px" />
            ) : (
              <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-subtle">
                {m.filename ?? m.mimeType}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
