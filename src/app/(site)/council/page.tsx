import type { Metadata } from "next";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { CouncilShowcase } from "@/components/sections/council-showcase";
import { getCouncil, getCouncilSections, getFaqs, getPresident } from "@/lib/content";
import { numberWord } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Council Team",
  description:
    "The 2026/27 Woxsen Student Council — one council, one job: every voice gets heard.",
};

export const revalidate = 60;

export default async function CouncilPage() {
  const members = await getCouncil();
  const president = await getPresident();
  const sections = await getCouncilSections();
  const faqs = await getFaqs("council");

  return (
    <div className="pt-32 sm:pt-40">
      <section className="container">
        <Reveal className="max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-14 bg-line/30" aria-hidden />
            <span className="kicker">Session 2026/27 · {members.length} members</span>
          </div>
          <h1 className="display text-balance text-6xl leading-[0.92] sm:text-8xl lg:text-[10rem]">
            <span className="block">The faces</span>
            <span className="block italic text-accent">behind the work.</span>
          </h1>
          <p className="mt-10 max-w-2xl text-balance text-lg text-muted">
            {numberWord(members.length)} students. One council. One job — to
            make sure every voice on this campus is heard, every event runs
            well, and every concern reaches the right desk.
          </p>
        </Reveal>
      </section>

      <div className="mt-24 sm:mt-32">
        <CouncilShowcase president={president} sections={sections} />
      </div>

      <section className="container mt-40 mb-24 sm:mt-40">
        <Reveal>
          <div className="mb-10">
            <span className="kicker">Constitution</span>
            <h2 className="display mt-4 text-4xl sm:text-5xl">
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
            <Accordion.Item
              key={item.id}
              value={item.id}
              className="group/acc"
            >
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-ink">
                  <span className="display text-xl text-ink sm:text-2xl">
                    {item.question}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted transition-transform duration-300 group-data-[state=open]/acc:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-muted data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="max-w-3xl pb-6 pr-12 text-base leading-relaxed whitespace-pre-line">
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
