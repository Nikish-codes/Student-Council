import type { Metadata } from "next";
import Link from "next/link";
import { getClubs, getClubCategories } from "@/lib/content";
import { ClubSignupDirectory } from "./signup-directory";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Join a club · Woxsen Student Council",
  description:
    "Find your club at Woxsen. Browse student clubs and sign up in one place.",
  alternates: { canonical: "https://woxsenstudentcouncil.in/clubsignup" },
};

export default async function ClubSignupPage() {
  const [clubs, categories] = await Promise.all([
    getClubs(),
    getClubCategories(),
  ]);
  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-line/10 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-medium"
          >
            <span
              aria-hidden
              className="brand-crest h-9 w-9 shrink-0 bg-current"
            />
            <span>
              Woxsen{" "}
              <span className="block text-xs text-muted sm:inline sm:text-sm">
                Student Council
              </span>
            </span>
          </Link>
          <Link
            href="/clubs"
            className="text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            Explore clubs
          </Link>
        </header>
        <div className="pb-4 pt-6 sm:pt-8">
          <h1 className="display text-3xl leading-tight sm:text-4xl">
            Find your club<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            A new interest. Your kind of people. Apply here.
          </p>
          <p className="mt-3 text-sm font-semibold text-accent">
            You can only click &ldquo;Apply now&rdquo; for a maximum of{" "}
            <strong>2 clubs</strong>. Be mindful!
          </p>
        </div>
        <ClubSignupDirectory clubs={clubs} categories={categories} />
        <footer className="py-6 text-xs text-muted">
          Woxsen Student Council · 2026–27
        </footer>
      </div>
    </main>
  );
}
