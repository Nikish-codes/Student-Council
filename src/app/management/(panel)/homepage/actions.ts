"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { homepageConfig as t } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import type {
  ClosingCta, HomepageCta, HomepageHero, HomepageStat, ManifestoLine, QuickAction,
} from "@/lib/schemas";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
function json<T>(fd: FormData, k: string, fb: T): T {
  try {
    const v = s(fd, k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}
const csv = (fd: FormData, k: string) =>
  s(fd, k).split(",").map((x) => x.trim()).filter(Boolean);

export async function saveHomepage(fd: FormData) {
  await requireRole("super_admin", "admin");

  const ctas = json<HomepageCta[]>(fd, "heroCtas", []);
  const closingCtas = json<HomepageCta[]>(fd, "closingCtas", []);
  const rawStats = json<{ value: string; suffix: string; displayValue: string; label: string }[]>(fd, "stats", []);

  const hero: HomepageHero = {
    kicker: s(fd, "heroKicker"),
    headline: s(fd, "heroHeadline"),
    sublineLead: s(fd, "heroSublineLead"),
    sublineWords: csv(fd, "heroSublineWords"),
    subParagraph: s(fd, "heroSubParagraph"),
    ctas,
    marqueeText: s(fd, "heroMarqueeText"),
  };
  const closingCta: ClosingCta = {
    kicker: s(fd, "closingKicker"),
    headlineLead: s(fd, "closingHeadlineLead"),
    headlineTail: s(fd, "closingHeadlineTail"),
    ctas: closingCtas,
  };
  const stats: HomepageStat[] = rawStats.map((r) => ({
    value: Number(r.value) || 0,
    suffix: r.suffix || undefined,
    displayValue: r.displayValue || undefined,
    label: r.label,
  }));

  const values = {
    hero,
    statsKicker: s(fd, "statsKicker") || null,
    stats,
    manifestoKicker: s(fd, "manifestoKicker") || null,
    manifestoLines: json<ManifestoLine[]>(fd, "manifestoLines", []),
    manifestoFooter: s(fd, "manifestoFooter") || null,
    quickActions: json<QuickAction[]>(fd, "quickActions", []),
    closingCta,
    flagshipEventId: s(fd, "flagshipEventId") ? Number(s(fd, "flagshipEventId")) : null,
    featuredClubIds: json<number[]>(fd, "featuredClubIds", []),
    vaultStoryIds: json<number[]>(fd, "vaultStoryIds", []),
    tagline: s(fd, "tagline") || null,
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(t)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: t.id, set: values });

  revalidatePath("/");
  revalidatePath("/management/homepage");
}
