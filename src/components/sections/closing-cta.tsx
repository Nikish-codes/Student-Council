import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { Magnetic } from "@/components/motion/magnetic";
import type { ClosingCta as ClosingCtaData } from "@/lib/schemas";

const FALLBACK: ClosingCtaData = {
  kicker: "Get involved",
  headlineLead: "The Council is yours.",
  headlineTail: "Show up. Speak up.",
  ctas: [
    { label: "Meet the Council", href: "/council", variant: "primary" },
    { label: "Browse clubs", href: "/clubs", variant: "outline" },
  ],
};

export function ClosingCTA({ data }: { data?: ClosingCtaData }) {
  const d = data ?? FALLBACK;
  return (
    <section className="relative border-t border-line/10 py-32 sm:py-40">
      <div className="container">
        <Reveal className="flex flex-col items-start gap-10 text-balance">
          <span className="kicker">{d.kicker}</span>
          <h2 className="display max-w-4xl text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
            {d.headlineLead}
            <br />
            <span className="italic text-muted">{d.headlineTail}</span>
          </h2>
          <div className="flex flex-wrap gap-4 pt-4">
            {d.ctas.map((cta, i) =>
              cta.variant === "primary" ? (
                <Magnetic key={`${cta.href}-${i}`}>
                  <Button asChild size="lg">
                    <Link href={cta.href}>
                      {cta.label}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </Magnetic>
              ) : (
                <Button
                  key={`${cta.href}-${i}`}
                  asChild
                  variant={cta.variant}
                  size="lg"
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ),
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
