import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Rows3 } from "lucide-react";
import { db } from "@/db/client";
import {
  councilGroups as g,
  councilMembers as t,
  siteSettings,
} from "@/db/schema";
import { requireOps, isAdmin } from "@/lib/rbac";
import { unpairedCoLeads } from "@/lib/council";
import { mediaOptions } from "@/lib/media-options";
import { PageHeader } from "@/components/management/page-header";
import { DeleteButton } from "@/components/management/delete-button";
import { MediaField } from "@/components/management/fields";
import { Button } from "@/components/ui/button";
import { deleteCouncil, saveCouncilGroupPhoto } from "./actions";

export default async function CouncilPage() {
  const user = await requireOps();
  const [rows, groups, settings, media] = await Promise.all([
    db.select().from(t).orderBy(asc(t.sortOrder)),
    db.select({ id: g.id, title: g.title }).from(g),
    db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) }),
    mediaOptions(),
  ]);
  const groupTitle = new Map(groups.map((x) => [x.id, x.title]));
  const admin = isAdmin(user.role);

  // Co-leads are paired to their lead by role name ("Sports Co Lead" →
  // "Sports Lead"). A rename breaks that link and would hide them from the
  // public page silently, so flag the orphans here.
  const orphans = new Set(
    unpairedCoLeads(
      rows.map((m) => ({
        id: String(m.id),
        role: m.role,
        memberType: m.memberType,
      })),
    ).map((m) => m.id),
  );

  return (
    <div>
      <PageHeader
        kicker="Council members"
        title={`${rows.length} total`}
        newHref="/management/council/new"
        newLabel="New member"
      />

      <div className="mb-6">
        <Link
          href="/management/council/groups"
          className="inline-flex items-center gap-2 rounded-full border border-line/15 px-3 py-1.5 text-xs text-muted transition-colors hover:border-line/40 hover:text-ink"
        >
          <Rows3 className="h-3.5 w-3.5" />
          Manage page sections
        </Link>
      </div>

      <form
        action={saveCouncilGroupPhoto}
        className="mb-8 rounded-2xl border border-line/10 bg-surface-2/40 p-5 sm:p-6"
      >
        <div className="mb-5 max-w-2xl">
          <p className="kicker text-subtle">Council page</p>
          <h2 className="display mt-1 text-2xl">Full council group photo</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Upload a wide team photo or choose one from the media library. It
            appears between the council introduction and the member sections.
          </p>
        </div>
        <MediaField
          name="groupPhotoId"
          label="Group portrait"
          hint="wide image · upload or choose existing"
          defaultValue={settings?.councilGroupPhotoId ?? null}
          media={media}
        />
        <div className="mt-4 flex justify-end">
          <Button type="submit">Save group photo</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                className="border-b border-line/10 last:border-0 hover:bg-line/[0.02]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/management/council/${m.id}`}
                    className="font-medium hover:underline"
                  >
                    {m.name}
                  </Link>
                  {m.memberType === "president" ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
                      president
                    </span>
                  ) : null}
                  {m.memberType === "co_lead" ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-subtle">
                      co-lead
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted">{m.role}</td>
                <td className="px-4 py-3 text-xs">
                  {m.memberType === "president" ? (
                    <span className="text-subtle">—</span>
                  ) : m.memberType === "co_lead" ? (
                    orphans.has(String(m.id)) ? (
                      <span
                        className="text-amber-300/70"
                        title="No member holds the matching Lead role, so this co-lead appears nowhere on /council."
                      >
                        no matching lead
                      </span>
                    ) : (
                      <span className="text-subtle">under their lead</span>
                    )
                  ) : m.groupId != null && groupTitle.has(m.groupId) ? (
                    <span className="text-muted">
                      {groupTitle.get(m.groupId)}
                    </span>
                  ) : (
                    <span className="text-amber-300/70">ungrouped</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {admin ? (
                    <DeleteButton action={deleteCouncil.bind(null, m.id)} />
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-subtle" colSpan={4}>
                  No members yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
