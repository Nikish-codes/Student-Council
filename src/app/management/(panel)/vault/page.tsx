import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { homepageConfig as t } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { EditorShell, Fieldset } from "@/components/management/page-header";
import { VaultEditor } from "@/components/management/vault-editor";
import { SaveBar } from "@/components/management/fields";
import { saveVault } from "./actions";
import type { VaultStoryConfig } from "@/lib/schemas";

export default async function VaultPage() {
  await requireRole("super_admin", "admin");

  const row = await db.query.homepageConfig.findFirst({
    where: eq(t.id, 1),
  });

  const stories: VaultStoryConfig[] =
    (row?.vaultStories as VaultStoryConfig[] | null) ?? [];

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
