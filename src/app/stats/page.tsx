import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubSignupClicks, getClubs } from "@/lib/content";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Club signup clicks · Woxsen Student Council",
  robots: { index: false, follow: false },
};

export default async function StatsPage() {
  try {
    await requireRole("super_admin");
  } catch {
    notFound();
  }

  const [clicks, clubs] = await Promise.all([getClubSignupClicks(), getClubs()]);
  const totalBySlug = new Map(clicks.map((row) => [row.slug, row.total]));
  const rows = clubs
    .map((club) => ({
      name: club.name,
      slug: club.slug,
      total: totalBySlug.get(club.slug) ?? 0,
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const max = Math.max(1, ...rows.map((row) => row.total));
  const lastUpdated = clicks[0]?.updatedAt
    ? new Date(clicks[0].updatedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <main className="min-h-screen bg-bg px-4 py-8 text-ink sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="display text-2xl sm:text-3xl">Club signup clicks.</h1>
          <Link
            href="/management"
            className="text-xs text-muted underline underline-offset-4 hover:text-ink sm:text-sm"
          >
            Panel
          </Link>
        </header>
        <p className="mt-2 text-sm text-muted">
          {total} {total === 1 ? "click" : "clicks"} across {clubs.length}{" "}
          clubs. How often the <span className="text-ink">Apply now</span>{" "}
          button was clicked per club in the signup flow.
          {lastUpdated && ` Last click at ${lastUpdated}.`}
        </p>
        <ol className="mt-6 space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.slug}
              className="grid grid-cols-[minmax(7rem,10rem)_1fr] items-center gap-3 rounded-lg border border-line/10 bg-surface/40 py-2 pl-4 pr-3"
            >
              <span className="truncate text-xs font-medium sm:text-sm">
                {row.name}
              </span>
              <span className="flex items-center gap-3">
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-accent/70"
                    style={{ width: `${Math.max((row.total / max) * 100, row.total > 0 ? 4 : 0)}%` }}
                  />
                </span>
                <span className="w-10 text-right text-xs tabular-nums text-muted sm:text-sm">
                  {row.total}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
