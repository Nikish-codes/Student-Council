import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { ClubsExplorer } from "@/components/sections/clubs-explorer";
import { getClubCategories, getClubs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Student Clubs",
  description:
    "28 student-run clubs across design, performing arts, professional development, social impact and academics at Woxsen.",
};

export default async function ClubsPage() {
  const [clubs, categories] = await Promise.all([
    getClubs(),
    getClubCategories(),
  ]);
  return (
    <div className="pt-28 sm:pt-36">
      <section className="container">
        <Reveal className="max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-14 bg-line/30" aria-hidden />
            <span className="kicker">{clubs.length} communities · 2026/27</span>
          </div>
          <h1 className="display text-balance text-[clamp(48px,8vw,96px)] leading-[0.96]">
            <span className="block">Run by</span>
            <span className="block italic text-accent">students.</span>
          </h1>
          <p className="mt-8 max-w-[65ch] text-pretty text-base leading-relaxed text-muted">
            Every club below was started, is led by, and is run for students.
            Browse by category, or just scroll — they reveal themselves as you
            go.
          </p>
        </Reveal>
      </section>

      <section className="container mb-24 mt-24 sm:mb-28 sm:mt-28">
        <ClubsExplorer clubs={clubs} categories={categories} />
      </section>
    </div>
  );
}
