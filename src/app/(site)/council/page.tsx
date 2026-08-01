import type { Metadata } from "next";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { CouncilGroupPhoto } from "@/components/sections/council-group-photo";
import { CouncilShowcase } from "@/components/sections/council-showcase";
import {
  getCouncil,
  getCouncilGroupPhoto,
  getCouncilSections,
  getFaqs,
  getPresident,
} from "@/lib/content";
import { numberWord } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Council Team",
  description:
    "The 2026/27 Woxsen Student Council — one council, one job: every voice gets heard.",
};

export const revalidate = 60;

export default async function CouncilPage() {
  const [members, president, sections, faqs, groupPhoto] = await Promise.all([
    getCouncil(),
    getPresident(),
    getCouncilSections(),
    getFaqs("council"),
    getCouncilGroupPhoto(),
  ]);

  return (
    <div className="pt-32 sm:pt-40">
      <section className="container">
        <Reveal className="max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-14 bg-line/30" aria-hidden />
            <span className="kicker">
              Session 2026/27 · {members.length} members
            </span>
          </div>
          <h1 className="display text-balance text-6xl leading-[0.92] sm:text-8xl lg:text-[10rem]">
            <span className="block">The faces</span>
            <span className="block italic text-accent">behind the work.</span>
          </h1>
          {/* text-pretty, not text-balance: balancing is for headings, and this
              is a three-line paragraph where it just shortens every line. */}
          <p className="mt-10 max-w-2xl text-pretty text-lg text-muted">
            {numberWord(members.length)} students. One council. One job — to
            make sure every voice on this campus is heard, every event runs
            well, and every concern reaches the right desk.
          </p>
        </Reveal>
      </section>

      <CouncilGroupPhoto photo={groupPhoto} memberCount={members.length} />

      <div className="mt-24 sm:mt-32">
        <CouncilShowcase president={president} sections={sections} />
      </div>

      <section className="container mt-40 mb-24 sm:mt-40">
        <Reveal>
          <div className="mb-10">
            <span className="kicker">Constitution</span>
            {/* Matches the section headings in the showcase — same level in the
                page's outline, so the same size. */}
            <h2 className="display mt-4 text-4xl leading-[0.95] sm:text-6xl">
              How the Council works.
            </h2>
          </div>
        </Reveal>
        <Accordion.Root
          type="single"
          collapsible
          className="divide-y divide-line/10 border-y border-line/10"
        >
          {faqs.map((item) => (
            <Accordion.Item key={item.id} value={item.id} className="group/acc">
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-ink">
                  <span className="display text-xl text-ink sm:text-2xl">
                    {item.question}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted transition-transform duration-300 group-data-[state=open]/acc:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-muted data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="max-w-xl pb-6 pr-12 text-base leading-relaxed whitespace-pre-line">
                  {item.answer}
                </p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </section>
    </div>
  );
}
