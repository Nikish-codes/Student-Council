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
import { MediaField } from "@/components/management/fields";
import { Button } from "@/components/ui/button";
import { saveCouncilGroupPhoto } from "./actions";
import { CouncilTable } from "./council-table";

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

  const orphans = new Set(
    unpairedCoLeads(
      rows.map((m) => ({
        id: String(m.id),
        role: m.role,
        memberType: m.memberType,
      })),
    ).map((m) => m.id),
  );

  const tableRows = rows.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    memberType: m.memberType,
    isOrphan: orphans.has(String(m.id)),
    groupTitle: m.groupId != null ? groupTitle.get(m.groupId) ?? "" : "",
  }));

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

      <CouncilTable rows={tableRows} admin={admin} />
    </div>
  );
}
