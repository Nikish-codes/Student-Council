import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { SupportGuide } from "@/components/sections/support-guide";
import { getSupportChannels, getSiteSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Student Support",
  description:
    "How to reach the right desk at Woxsen — and what the Student Council can (and can't) do to help.",
};

export default async function SupportPage() {
  const [channels, settings] = await Promise.all([
    getSupportChannels(),
    getSiteSettings(),
  ]);

  return (
    <div className="pt-32 sm:pt-40">
      <section className="container">
        <Reveal className="max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-14 bg-line/30" aria-hidden />
            <span className="kicker">We don&apos;t run the desks. We help you reach them.</span>
          </div>
          <h1 className="display text-balance text-6xl leading-[0.92] sm:text-8xl lg:text-[10rem]">
            <span className="block">Help, the</span>
            <span className="block italic text-accent">honest way.</span>
          </h1>
          <p className="mt-10 max-w-2xl text-balance text-lg text-muted">
            The Council isn&apos;t a portal. We&apos;re a guide. Below is a clear
            map of which office actually handles what, exactly what to bring,
            and where the Council can step in if you need a nudge.
          </p>
        </Reveal>
      </section>

      <SupportGuide
        channels={channels}
        grievanceCategories={settings.grievanceCategories}
        grievanceMailTo={settings.grievanceMailTo}
      />
    </div>
  );
}
