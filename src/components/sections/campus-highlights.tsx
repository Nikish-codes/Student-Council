import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { ParallaxImage } from "@/components/motion/parallax-image";
import { getHighlights } from "@/lib/content";
import { cn } from "@/lib/utils";

const SPAN_CLASSES: Record<string, string> = {
  sm: "col-span-6 sm:col-span-4 aspect-[4/5]",
  md: "col-span-6 sm:col-span-4 aspect-square",
  lg: "col-span-12 sm:col-span-8 aspect-[16/10]",
  xl: "col-span-12 sm:col-span-8 aspect-[16/9]",
};

export async function CampusHighlights() {
  const items = await getHighlights();

  return (
    <section className="container py-32 sm:py-48">
      <Reveal>
        <SectionHeading
          kicker="Campus Life"
          title={
            <>
              A year, a campus, a thousand{" "}
              <span className="italic text-accent">moments.</span>
            </>
          }
          description="Glimpses from the events, evenings, hackathons and quiet afternoons that make Woxsen feel like Woxsen."
        />
      </Reveal>

      <div className="mt-16 grid grid-cols-12 gap-4 sm:gap-6">
        {items.map((h, i) => (
          <Reveal
            key={h.id}
            delay={i * 0.05}
            className={cn(SPAN_CLASSES[h.span] ?? SPAN_CLASSES.md)}
          >
            <ParallaxImage
              src={h.src}
              alt={h.alt}
              fallbackLabel="Campus"
              amount={40}
              containerClassName="h-full w-full"
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
