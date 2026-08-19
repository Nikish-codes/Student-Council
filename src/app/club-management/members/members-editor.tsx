"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { MediaField, type MediaOption } from "@/components/management/fields";
import type { ClubPageSnapshot } from "@/lib/revisions";
import { savePublicMembers } from "./actions";

type Person = NonNullable<ClubPageSnapshot["people"]>[number];
type EditablePerson = Person & { key: string };

const input =
  "mt-2 w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-line/40";

function SubmitButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="submit"
        name="intent"
        value="save"
        disabled={pending}
        className="min-h-10 rounded-xl border border-line/15 px-4 text-sm font-medium hover:bg-line/5 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save draft"}
      </button>
      <button
        type="submit"
        name="intent"
        value="submit"
        disabled={pending}
        className="min-h-10 rounded-xl bg-ink px-4 text-sm font-medium text-bg disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </div>
  );
}

export function MembersEditor({
  clubId,
  revisionId,
  baseVersion,
  initialPeople,
  media,
  saved,
}: {
  clubId: number;
  revisionId?: string;
  baseVersion: number;
  initialPeople: Person[];
  media: MediaOption[];
  saved: boolean;
}) {
  const [people, setPeople] = useState<EditablePerson[]>(() =>
    initialPeople.map((person, index) => ({
      ...person,
      key: person.id ? `member-${person.id}` : `member-new-${index}`,
    })),
  );
  const payload = useMemo(
    () =>
      people.map((editablePerson, index) => {
        const { key, ...person } = editablePerson;
        void key;
        return { ...person, sortOrder: index * 10 };
      }),
    [people],
  );

  function update(index: number, values: Partial<Person>) {
    setPeople((current) =>
      current.map((person, personIndex) =>
        personIndex === index ? { ...person, ...values } : person,
      ),
    );
  }

  function addPerson() {
    setPeople((current) => [
      ...current,
      {
        key: `member-new-${Date.now()}`,
        name: "",
        role: "",
        program: "",
        photoId: null,
        email: null,
        linkedin: null,
        quote: null,
        bio: null,
        sortOrder: current.length * 10,
      },
    ]);
  }

  return (
    <form action={savePublicMembers} className="space-y-7">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="revisionId" value={revisionId ?? ""} />
      <input type="hidden" name="baseVersion" value={baseVersion} />
      <input type="hidden" name="people" value={JSON.stringify(payload)} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-subtle">Public profiles</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">
            Members
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">
            These profiles appear on your club page. They do not grant Club
            Studio access.
          </p>
        </div>
        <SubmitButtons />
      </header>

      {saved ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
        >
          Members draft saved.
        </p>
      ) : null}

      <div className="space-y-5">
        {people.map((person, index) => (
          <section
            key={person.key}
            className="rounded-2xl bg-surface p-5 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                {person.name || `Member ${index + 1}`}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setPeople((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-red-300 hover:bg-red-500/10"
                aria-label={`Remove ${person.name || `member ${index + 1}`}`}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
              <MediaField
                name={`memberPhoto-${person.key}`}
                label="Portrait"
                hint="square image"
                defaultValue={person.photoId ?? null}
                media={media}
                onValueChange={(photoId) => update(index, { photoId })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    className={input}
                    required
                    value={person.name}
                    onChange={(event) =>
                      update(index, { name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Role">
                  <input
                    className={input}
                    required
                    value={person.role}
                    onChange={(event) =>
                      update(index, { role: event.target.value })
                    }
                  />
                </Field>
                <Field label="Program / batch">
                  <input
                    className={input}
                    value={person.program}
                    onChange={(event) =>
                      update(index, { program: event.target.value })
                    }
                  />
                </Field>
                <Field label="Email">
                  <input
                    className={input}
                    type="email"
                    value={person.email ?? ""}
                    onChange={(event) =>
                      update(index, { email: event.target.value || null })
                    }
                  />
                </Field>
                <Field label="LinkedIn URL">
                  <input
                    className={input}
                    type="url"
                    value={person.linkedin ?? ""}
                    onChange={(event) =>
                      update(index, { linkedin: event.target.value || null })
                    }
                  />
                </Field>
                <Field label="Short quote">
                  <input
                    className={input}
                    maxLength={1200}
                    value={person.quote ?? ""}
                    onChange={(event) =>
                      update(index, { quote: event.target.value || null })
                    }
                  />
                </Field>
                <Field label="About" wide>
                  <textarea
                    className={input}
                    rows={4}
                    maxLength={1200}
                    value={person.bio ?? ""}
                    onChange={(event) =>
                      update(index, { bio: event.target.value || null })
                    }
                  />
                </Field>
              </div>
            </div>
          </section>
        ))}
      </div>

      {!people.length ? (
        <div className="rounded-2xl border border-dashed border-line/20 px-6 py-12 text-center">
          <h2 className="font-medium">No public members yet</h2>
          <p className="mt-1 text-sm text-muted">
            Add the first profile for your club page.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/10 pt-6">
        <button
          type="button"
          onClick={addPerson}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line/15 px-4 text-sm font-medium hover:bg-line/5"
        >
          <Plus className="h-4 w-4" /> Add member
        </button>
        <SubmitButtons />
      </div>
    </form>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`text-sm font-medium text-muted ${wide ? "sm:col-span-2" : ""}`}
    >
      {label}
      {children}
    </label>
  );
}
