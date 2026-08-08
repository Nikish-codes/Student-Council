import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { homepageConfig as t } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import { VaultEditor } from "@/components/management/vault-editor";
import { SaveBar } from "@/components/management/fields";
import { saveVault } from "./actions";
import type { VaultStoryConfig } from "@/lib/schemas";
import { VAULT_FALLBACK_STORIES } from "@/lib/vault-defaults";

export default async function VaultPage() {
  await requireRole("super_admin", "admin");

  const row = await db.query.homepageConfig.findFirst({
    where: eq(t.id, 1),
  });

  const dbStories: VaultStoryConfig[] =
    (row?.vaultStories as VaultStoryConfig[] | null) ?? [];

  // When the DB has no custom stories, pre-populate the editor with the
  // fallback stories that are actually displaying on the homepage so the
  // user can see and edit what's live. Saving will persist them to the DB.
  const stories = dbStories.length > 0 ? dbStories : VAULT_FALLBACK_STORIES;
  const usingFallback = dbStories.length === 0;

  return (
    <EditorShell
      kicker="Homepage"
      title="Vault editor"
      action={saveVault}
    >
      <p className="text-sm text-muted">
        The vault is the autoplaying slideshow on the homepage — the section
        labelled <span className="font-mono text-xs">01 / 04</span>. Each story
        can be a video, an image, or text-only. Stories without a title are
        dropped on save. Leave this empty to fall back to recap-based stories
        from the Homepage editor.
      </p>

      {usingFallback ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
          No custom stories saved — showing the fallback stories currently
          displaying on the homepage. Save to make these your own (or edit and
          save to override).
        </p>
      ) : null}

      <Fieldset
        title="Stories"
        hint="Add, remove, and reorder. The first story autoplays when the page loads."
      >
        <VaultEditor defaultValue={stories} />
      </Fieldset>

      <SaveBar label="Save vault" />
    </EditorShell>
  );
}
