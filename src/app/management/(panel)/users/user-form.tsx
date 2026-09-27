"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  TextField,
  SelectField,
} from "@/components/management/fields";
import { createUser, updateUser, type UserActionState } from "./actions";

function SaveBarWithStatus({
  label = "Save changes",
  cancelHref,
}: {
  label?: string;
  cancelHref?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-8 flex items-center justify-end gap-3 border-t border-line/10 pt-6">
      {cancelHref ? (
        <Button variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}

export function NewUserForm({
  roles,
  clubs,
}: {
  roles: { value: string; label: string }[];
  clubs: { id: number; name: string }[];
}) {
  const [state, formAction] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="kicker text-subtle">New user</p>
        <h1 className="display mt-1 text-3xl">Invite someone</h1>
      </div>
      <div className="flex flex-col gap-5">
        {state?.error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {state.error}
          </div>
        ) : null}
        <TextField name="name" label="Full name" required />
        <TextField
          name="email"
          label="Email"
          required
          placeholder="someone@woxsen.edu.in"
        />
        <TextField
          name="password"
          label="Temporary password"
          required
          minLength={6}
          hint="At least 6 characters · share over a secure channel"
        />
        <SelectField
          name="role"
          label="Role"
          options={roles}
          defaultValue="editor"
        />
        <SelectField
          name="clubId"
          label="Club (only relevant for Club Leads)"
          defaultValue=""
          options={[
            { value: "", label: "— None —" },
            ...clubs.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
        <SaveBarWithStatus label="Create user" cancelHref="/management/users" />
      </div>
    </form>
  );
}

export function EditUserForm({
  id,
  user,
  roles,
  clubs,
  isSelf,
  roleLabel,
}: {
  id: number;
  user: {
    name: string;
    email: string;
    role: string;
    clubId: number | null;
  };
  roles: { value: string; label: string }[];
  clubs: { id: number; name: string }[];
  isSelf: boolean;
  roleLabel: string;
}) {
  const boundAction = updateUser.bind(null, id);
  const [state, formAction] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="kicker text-subtle">Edit {user.email}</p>
        <h1 className="display mt-1 text-3xl">{user.name}</h1>
      </div>
      <div className="flex flex-col gap-5">
        {state?.error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {state.error}
          </div>
        ) : null}
        <TextField
          name="name"
          label="Full name"
          required
          defaultValue={user.name}
        />
        <TextField
          name="email"
          label="Email"
          required
          defaultValue={user.email}
        />
        <TextField
          name="password"
          label="Reset password"
          minLength={6}
          hint="Leave blank to keep current password · minimum 6 characters. Setting a new one also unlocks the account."
        />
        {isSelf ? (
          <div>
            <p className="kicker text-subtle">Role</p>
            <p className="mt-2 text-sm text-muted">
              {roleLabel} · You cannot change your own role.
            </p>
            <input type="hidden" name="role" value={user.role} />
          </div>
        ) : (
          <SelectField
            name="role"
            label="Role"
            defaultValue={user.role}
            options={roles}
          />
        )}
        <SelectField
          name="clubId"
          label="Club (only relevant for Club Leads)"
          defaultValue={user.clubId ? String(user.clubId) : ""}
          options={[
            { value: "", label: "— None —" },
            ...clubs.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
        <SaveBarWithStatus label="Save changes" cancelHref="/management/users" />
      </div>
    </form>
  );
}
