"use client";

import * as React from "react";

/**
 * The reusable labeled-input atoms used inside wizard steps. Each one
 * renders a label, an optional tip, the control itself, and an optional
 * character counter. Strongly opinionated visuals so all wizards feel
 * the same.
 */

type BaseFieldProps = {
  label: string;
  /** Plain-English description shown under the label. */
  hint?: string;
  /** Tip block shown to the right of the control (or below on mobile). */
  tip?: React.ReactNode;
  /** Counted against `maxLength` if provided. */
  value: string;
  maxLength?: number;
  required?: boolean;
  error?: string;
};

export function TextField({
  label,
  hint,
  tip,
  value,
  onChange,
  maxLength,
  required,
  placeholder,
  error,
  type = "text",
}: BaseFieldProps & {
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "url" | "email";
}) {
  return (
    <FieldFrame label={label} hint={hint} tip={tip} required={required} error={error}>
      <input
        type={type}
        className="wc-input"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {maxLength ? (
        <Counter current={value.length} max={maxLength} />
      ) : null}
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  hint,
  tip,
  value,
  onChange,
  maxLength,
  required,
  placeholder,
  error,
  rows = 4,
}: BaseFieldProps & {
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <FieldFrame label={label} hint={hint} tip={tip} required={required} error={error}>
      <textarea
        className="wc-input wc-input--textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {maxLength ? (
        <Counter current={value.length} max={maxLength} />
      ) : null}
    </FieldFrame>
  );
}

export function SelectField({
  label,
  hint,
  tip,
  value,
  onChange,
  options,
  required,
  error,
}: Omit<BaseFieldProps, "maxLength"> & {
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <FieldFrame label={label} hint={hint} tip={tip} required={required} error={error}>
      <select
        className="wc-input wc-input--select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export function DateField({
  label,
  hint,
  tip,
  value,
  onChange,
  required,
  error,
}: Omit<BaseFieldProps, "maxLength"> & {
  onChange: (v: string) => void;
}) {
  return (
    <FieldFrame label={label} hint={hint} tip={tip} required={required} error={error}>
      <input
        type="datetime-local"
        className="wc-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldFrame>
  );
}

export function CheckboxField({
  label,
  hint,
  tip,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  tip?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="wc-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="wc-check__body">
        <span className="wc-check__label">{label}</span>
        {hint ? <span className="wc-check__hint">{hint}</span> : null}
        {tip ? <span className="wc-check__tip">{tip}</span> : null}
      </span>
    </label>
  );
}

/* ──────────────────────────────────────────────────────────── */

function FieldFrame({
  label,
  hint,
  tip,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  tip?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="wc-field" data-error={error ? "true" : undefined}>
      <div className="wc-field__top">
        <label className="wc-field__label">
          {label}
          {required ? <span className="wc-field__required" aria-hidden> *</span> : null}
        </label>
        {hint ? <p className="wc-field__hint">{hint}</p> : null}
      </div>
      <div className="wc-field__row">
        <div className="wc-field__control">{children}</div>
        {tip ? (
          <aside className="wc-field__tip">
            <span className="wc-field__tip-mark" aria-hidden>
              💡
            </span>
            <span>{tip}</span>
          </aside>
        ) : null}
      </div>
      {error ? <p className="wc-field__error">{error}</p> : null}
    </div>
  );
}

function Counter({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const state = ratio > 1 ? "over" : ratio > 0.85 ? "warn" : "ok";
  return (
    <span className="wc-counter" data-state={state}>
      {current} / {max}
    </span>
  );
}

/**
 * A minimal media picker. Shows a button that opens a side panel listing
 * recent uploads from the Media collection. The actual upload happens in
 * Payload's normal Media collection — this wizard only lets you pick from
 * what's already there. Keeps the wizard simple.
 */
export function MediaPickerField({
  label,
  hint,
  tip,
  value,
  onChange,
  required,
  error,
  /** Filter the media library by mime type prefix, e.g. "image/". */
  mimePrefix = "image/",
}: {
  label: string;
  hint?: string;
  tip?: React.ReactNode;
  value: { id: string; url: string; alt?: string } | null;
  onChange: (v: { id: string; url: string; alt?: string } | null) => void;
  required?: boolean;
  error?: string;
  mimePrefix?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<
    Array<{ id: string; url: string; alt?: string; mimeType: string; filename: string }>
  >([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/media?limit=24&sort=-updatedAt&depth=0`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const docs = (data?.docs ?? []) as Array<{
          id: string;
          url?: string;
          filename?: string;
          mimeType?: string;
          alt?: string;
        }>;
        setItems(
          docs
            .filter((d) => (d.mimeType ?? "").startsWith(mimePrefix))
            .map((d) => ({
              id: String(d.id),
              url: d.url ?? "",
              alt: d.alt,
              mimeType: d.mimeType ?? "",
              filename: d.filename ?? "",
            })),
        );
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, mimePrefix]);

  return (
    <FieldFrame label={label} hint={hint} tip={tip} required={required} error={error}>
      {value ? (
        <div className="wc-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt={value.alt ?? ""} className="wc-media__preview" />
          <div className="wc-media__meta">
            <span className="wc-media__alt">{value.alt || "No alt text"}</span>
            <div className="wc-media__actions">
              <button
                type="button"
                className="wc-wiz__btn wc-wiz__btn--ghost wc-wiz__btn--sm"
                onClick={() => setOpen(true)}
              >
                Change
              </button>
              <button
                type="button"
                className="wc-wiz__btn wc-wiz__btn--ghost wc-wiz__btn--sm"
                onClick={() => onChange(null)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="wc-media__pick"
          onClick={() => setOpen(true)}
        >
          + Pick from media library
        </button>
      )}
      <p className="wc-media__hint">
        Need to upload something new?{" "}
        <a href="/admin/collections/media/create" target="_blank" rel="noreferrer">
          Open the media library in a new tab →
        </a>
      </p>

      {open ? (
        <div className="wc-media__modal" onClick={() => setOpen(false)}>
          <div
            className="wc-media__modal-body"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="wc-media__modal-head">
              <h3>Pick a file from the media library</h3>
              <button
                type="button"
                className="wc-wiz__btn wc-wiz__btn--ghost wc-wiz__btn--sm"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>
            {loading ? (
              <p className="wc-media__empty">Loading library…</p>
            ) : items.length === 0 ? (
              <p className="wc-media__empty">
                No files match. Upload one in the{" "}
                <a href="/admin/collections/media/create" target="_blank" rel="noreferrer">
                  media library
                </a>{" "}
                first.
              </p>
            ) : (
              <ul className="wc-media__grid">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      className="wc-media__tile"
                      onClick={() => {
                        onChange({ id: it.id, url: it.url, alt: it.alt });
                        setOpen(false);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.url} alt={it.alt ?? ""} />
                      <span className="wc-media__tile-name">{it.filename}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </FieldFrame>
  );
}

/**
 * Picks a related document from a Payload collection by free-text search.
 * Used for things like "pick the event this recap is for".
 */
export function RelationshipField({
  label,
  hint,
  tip,
  value,
  onChange,
  required,
  error,
  collection,
  titleField = "title",
  placeholder = "Search…",
}: {
  label: string;
  hint?: string;
  tip?: React.ReactNode;
  value: { id: string; title: string } | null;
  onChange: (v: { id: string; title: string } | null) => void;
  required?: boolean;
  error?: string;
  collection: string;
  titleField?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("depth", "0");
    if (query.trim()) {
      params.set(`where[${titleField}][like]`, query.trim());
    }
    fetch(`/api/${collection}?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const docs = (data?.docs ?? []) as Array<Record<string, unknown>>;
        setItems(
          docs.map((d) => ({
            id: String(d.id),
            title: String(d[titleField] ?? d.id),
          })),
        );
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, query, collection, titleField]);

  return (
    <FieldFrame label={label} hint={hint} tip={tip} required={required} error={error}>
      {value ? (
        <div className="wc-rel">
          <span className="wc-rel__chip">{value.title}</span>
          <div className="wc-rel__actions">
            <button
              type="button"
              className="wc-wiz__btn wc-wiz__btn--ghost wc-wiz__btn--sm"
              onClick={() => setOpen(true)}
            >
              Change
            </button>
            <button
              type="button"
              className="wc-wiz__btn wc-wiz__btn--ghost wc-wiz__btn--sm"
              onClick={() => onChange(null)}
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="wc-media__pick" onClick={() => setOpen(true)}>
          + Pick from {collection}
        </button>
      )}

      {open ? (
        <div className="wc-media__modal" onClick={() => setOpen(false)}>
          <div className="wc-media__modal-body" onClick={(e) => e.stopPropagation()}>
            <header className="wc-media__modal-head">
              <h3>Pick from {collection}</h3>
              <button
                type="button"
                className="wc-wiz__btn wc-wiz__btn--ghost wc-wiz__btn--sm"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>
            <input
              type="text"
              className="wc-input"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {loading ? (
              <p className="wc-media__empty">Searching…</p>
            ) : items.length === 0 ? (
              <p className="wc-media__empty">No results.</p>
            ) : (
              <ul className="wc-rel__list">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      className="wc-rel__row"
                      onClick={() => {
                        onChange(it);
                        setOpen(false);
                      }}
                    >
                      {it.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </FieldFrame>
  );
}
