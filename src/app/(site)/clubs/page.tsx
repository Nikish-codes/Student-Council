import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { ClubsExplorer } from "@/components/sections/clubs-explorer";
import { getClubCategories, getClubs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Student Clubs",
  description:
    "29 student-run clubs across tech, design, performing arts, sports and entrepreneurship at Woxsen.",
};

export default async function ClubsPage() {
  const [clubs, categories] = await Promise.all([
    getClubs(),
    getClubCategories(),
  ]);
  return (
    <div className="pt-32 sm:pt-40">
      <section className="container">
        <Reveal className="max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-14 bg-line/30" aria-hidden />
            <span className="kicker">{clubs.length} communities · 2026/27</span>
          </div>
          <h1 className="display text-balance text-6xl leading-[0.92] sm:text-8xl lg:text-[10rem]">
            <span className="block">Run by</span>
            <span className="block italic text-accent">students.</span>
          </h1>
          <p className="mt-10 max-w-2xl text-balance text-lg text-muted">
            Every club below was started, is led by, and is run for students.
            Browse by category, or just scroll — they reveal themselves as
            you go.
          </p>
        </Reveal>
      </section>

      <section className="container mt-32 mb-32">
        <ClubsExplorer clubs={clubs} categories={categories} />
      </section>
    </div>
  );
}
