"use client";

import { useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const inputCls =
  "w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-line/40";

export type MediaOption = { id: number; url: string; filename?: string | null };

function Label({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <span className="kicker text-subtle">{label}</span>
      {hint ? <span className="text-[11px] text-subtle">{hint}</span> : null}
    </div>
  );
}

export function TextField(props: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const { label, hint, onChange, value, ...rest } = props;
  return (
    <div>
      <Label label={label} hint={hint} />
      <input
        {...rest}
        defaultValue={value === undefined ? props.defaultValue ?? "" : undefined}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={inputCls}
      />
    </div>
  );
}

export function TextAreaField(props: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  required?: boolean;
  maxLength?: number;
  rows?: number;
}) {
  const { label, hint, rows = 3, defaultValue, ...rest } = props;
  return (
    <div>
      <Label label={label} hint={hint} />
      <textarea {...rest} rows={rows} defaultValue={defaultValue ?? ""} className={inputCls} />
    </div>
  );
}

export function NumberField(props: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: number | null;
  min?: number;
  required?: boolean;
}) {
  const { label, hint, defaultValue, ...rest } = props;
  return (
    <div>
      <Label label={label} hint={hint} />
      <input
        {...rest}
        type="number"
        defaultValue={defaultValue ?? ""}
        className={inputCls}
      />
    </div>
  );
}

export function SelectField(props: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  const { label, hint, options, ...rest } = props;
  return (
    <div>
      <Label label={label} hint={hint} />
      <select {...rest} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Format an ISO timestamp as a `datetime-local` value in the BROWSER's local
 * time. `toISOString()` returns UTC, which a `datetime-local` input renders as
 * if it were local — silently shifting events by the admin's UTC offset on
 * every round-trip. Build the string from local components instead.
 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function DateTimeField(props: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const { label, hint, defaultValue, ...rest } = props;
  const local = defaultValue ? toLocalInput(defaultValue) : "";
  return (
    <div>
      <Label label={label} hint={hint} />
      <input {...rest} type="datetime-local" defaultValue={local} className={inputCls} />
    </div>
  );
}

export function CheckboxField(props: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-muted">
      <input
        type="checkbox"
        name={props.name}
        defaultChecked={props.defaultChecked}
        className="h-4 w-4 rounded border-line/30 bg-surface-2"
      />
      {props.label}
    </label>
  );
}

/** Comma-separated tags → submitted as a single string; parse server-side. */
export function TagsField(props: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string[] | null;
}) {
  return (
    <div>
      <Label label={props.label} hint={props.hint ?? "comma-separated"} />
      <input
        name={props.name}
        defaultValue={(props.defaultValue ?? []).join(", ")}
        className={inputCls}
      />
    </div>
  );
}

/** Single media reference with inline upload + pick-from-library. */
export function MediaField({
  name,
  label,
  hint,
  defaultValue,
  media,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: number | null;
  media: MediaOption[];
}) {
  const [list, setList] = useState<MediaOption[]>(media);
  const [selected, setSelected] = useState<number | null>(defaultValue ?? null);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = list.find((m) => m.id === selected);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      const m: MediaOption = json.media;
      setList((l) => [m, ...l]);
      setSelected(m.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <Label label={label} hint={hint} />
      <input type="hidden" name={name} value={selected ?? ""} readOnly />
      <div className="rounded-xl border border-line/15 bg-surface-2 p-3">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-line/5">
            {current ? (
              <Image src={current.url} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-subtle">
                none
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line/15 px-3 py-1.5 text-xs text-ink hover:border-line/40">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" hidden onChange={onUpload} accept="image/*,video/*,application/pdf" />
            </label>
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              className="rounded-full border border-line/15 px-3 py-1.5 text-xs text-ink hover:border-line/40"
            >
              Choose existing
            </button>
            {current ? (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-subtle hover:text-ink"
              >
                <X className="h-3.5 w-3.5" /> clear
              </button>
            ) : null}
          </div>
        </div>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
        {picking ? (
          <div className="mt-3 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {list.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelected(m.id);
                  setPicking(false);
                }}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md border",
                  selected === m.id ? "border-ink" : "border-line/10 hover:border-line/40",
                )}
              >
                <Image src={m.url} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type RepeaterCol = {
  name: string;
  label: string;
  type?: "text" | "number";
};

/**
 * Generic repeatable list of flat objects. Serialises to JSON in a hidden
 * input named `name`; parse with JSON.parse server-side.
 */
export function RepeaterField<T extends Record<string, string | number>>({
  name,
  label,
  hint,
  columns,
  defaultValue,
  template,
}: {
  name: string;
  label: string;
  hint?: string;
  columns: RepeaterCol[];
  defaultValue?: T[] | null;
  /** Serializable blank row. If omitted, derived from `columns`. */
  template?: T;
}) {
  const [rows, setRows] = useState<T[]>(defaultValue ?? []);
  const blank = (): T =>
    template
      ? ({ ...template })
      : (Object.fromEntries(
          columns.map((c) => [c.name, c.type === "number" ? 0 : ""]),
        ) as T);

  const update = (i: number, key: string, value: string) =>
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)),
    );

  return (
    <div>
      <Label label={label} hint={hint} />
      <input type="hidden" name={name} value={JSON.stringify(rows)} readOnly />
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {columns.map((c) => (
              <input
                key={c.name}
                placeholder={c.label}
                type={c.type === "number" ? "number" : "text"}
                value={String(row[c.name] ?? "")}
                onChange={(e) => update(i, c.name, e.target.value)}
                className={cn(inputCls, "py-2")}
              />
            ))}
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-lg p-2 text-subtle hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((r) => [...r, blank()])}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-line/15 px-3 py-1.5 text-xs text-ink hover:border-line/40"
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>
      </div>
    </div>
  );
}

/** Multi-select as a checkbox grid; submits a JSON array of ids in `name`. */
export function MultiSelectField({
  name,
  label,
  hint,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  options: { id: number; label: string }[];
  defaultValue?: number[] | null;
}) {
  const [selected, setSelected] = useState<number[]>(defaultValue ?? []);
  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div>
      <Label label={label} hint={hint ?? "select any"} />
      <input type="hidden" name={name} value={JSON.stringify(selected)} readOnly />
      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-line/15 bg-surface-2 p-3">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => toggle(o.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              selected.includes(o.id)
                ? "border-ink bg-ink text-bg"
                : "border-line/15 text-muted hover:border-line/40",
            )}
          >
            {o.label}
          </button>
        ))}
        {options.length === 0 ? (
          <span className="text-xs text-subtle">No options.</span>
        ) : null}
      </div>
    </div>
  );
}

export function SaveBar({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 mt-2 flex items-center justify-end gap-3 border-t border-line/10 bg-bg/80 py-4 backdrop-blur-xl">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}
