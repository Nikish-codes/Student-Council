import { eq } from "drizzle-orm";
import { KeyRound, ShieldCheck, UserMinus, Users } from "lucide-react";

import { db } from "@/db/client";
import { clubMemberships } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { changeMemberAccess, inviteMember, transferPresident } from "./actions";

const input = "mt-2 h-11 w-full rounded-xl border border-line/15 bg-surface-2 px-3 text-sm outline-none focus:border-line/40";

export default async function ClubTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const query = await searchParams;
  const active = await requireStudioClub(query.club);
  const rows = await db.query.clubMemberships.findMany({
    where: eq(clubMemberships.clubId, active.clubId),
    with: { user: { columns: { id: true, name: true, email: true } } },
  });
  const president = active.membershipRole === "president";
  const activeRows = rows.filter((row) => row.isActive);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-medium text-subtle">Access and ownership</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">Team</h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">
          Club access is separate from global roles. Each person receives only the tools they need for this club.
        </p>
      </header>

      {president ? (
        <section className="rounded-2xl bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 text-subtle" />
            <div>
              <h2 className="text-lg font-semibold">Add a team member</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Existing users keep their password. A new user must replace the temporary password after signing in.
              </p>
            </div>
          </div>
          <form action={inviteMember} className="mt-6 grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="clubId" value={active.clubId} />
            <Field label="Name"><input className={input} name="name" required /></Field>
            <Field label="Email"><input className={input} name="email" type="email" required /></Field>
            <Field label="Temporary password" hint="New accounts only, 10 characters minimum">
              <input className={input} name="temporaryPassword" type="password" minLength={10} />
            </Field>
            <fieldset>
              <legend className="text-sm font-medium text-muted">Permissions</legend>
              <div className="mt-2 flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-surface-2 px-3">
                <Toggle name="canEditPage" label="Page" />
                <Toggle name="canManageEvents" label="Events" />
                <Toggle name="canManageMedia" label="Media" />
              </div>
            </fieldset>
            <button className="min-h-11 rounded-xl bg-ink px-5 text-sm font-medium text-bg transition-transform active:scale-[0.98] sm:col-start-2" type="submit">
              Add member
            </button>
          </form>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Current access</h2>
        <div className="mt-4 space-y-3">
          {activeRows.map((row) => (
            <article key={row.id} className="rounded-2xl bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{row.user.name}</h3>
                    {row.membershipRole === "president" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-xs text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" /> President
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{row.user.email}</p>
                </div>
                {row.membershipRole !== "president" ? (
                  <p className="text-xs text-subtle">
                    {[row.canEditPage && "Page", row.canManageEvents && "Events", row.canManageMedia && "Media"].filter(Boolean).join(" · ") || "No editing permissions"}
                  </p>
                ) : null}
              </div>

              {president && row.membershipRole !== "president" ? (
                <div className="mt-5 grid gap-5 border-t border-line/10 pt-5 lg:grid-cols-2">
                  <form action={changeMemberAccess} className="flex flex-wrap items-center gap-4">
                    <input type="hidden" name="clubId" value={active.clubId} />
                    <input type="hidden" name="membershipId" value={row.id} />
                    <Toggle name="canEditPage" label="Page" defaultChecked={row.canEditPage} />
                    <Toggle name="canManageEvents" label="Events" defaultChecked={row.canManageEvents} />
                    <Toggle name="canManageMedia" label="Media" defaultChecked={row.canManageMedia} />
                    <button className="min-h-10 rounded-xl border border-line/15 px-4 text-sm font-medium hover:bg-line/5" type="submit" name="intent" value="save">
                      Save access
                    </button>
                    <button className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-red-300 hover:bg-red-500/10" type="submit" name="intent" value="revoke">
                      <UserMinus className="h-4 w-4" /> Revoke
                    </button>
                  </form>
                  <form action={transferPresident} className="rounded-xl bg-surface-2 p-4">
                    <input type="hidden" name="clubId" value={active.clubId} />
                    <input type="hidden" name="membershipId" value={row.id} />
                    <label className="text-sm font-medium text-muted">
                      Transfer presidency to {row.user.name}
                      <span className="mt-1 block text-xs font-normal leading-5 text-subtle">Type {active.clubName} to confirm. You will become a normal member.</span>
                      <input className={input} name="confirmation" required autoComplete="off" />
                    </label>
                    <button className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-bg" type="submit">
                      <KeyRound className="h-4 w-4" /> Transfer presidency
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {rows.some((row) => !row.isActive) ? (
        <section>
          <h2 className="text-lg font-semibold">Revoked access</h2>
          <p className="mt-2 text-sm text-muted">Revoked memberships remain in the audit history and can be reactivated by inviting the same email.</p>
        </section>
      ) : null}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="text-sm font-medium text-muted">{label}{hint ? <span className="ml-2 text-xs font-normal text-subtle">{hint}</span> : null}{children}</label>;
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean | null }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <input type="checkbox" name={name} defaultChecked={Boolean(defaultChecked)} /> {label}
    </label>
  );
}
