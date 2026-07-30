"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CouncilCard } from "@/components/sections/council-card";
import { MemberLinks } from "@/components/sections/member-links";
import { MemberPortrait } from "@/components/sections/member-portrait";
import type { CouncilMemberWithCoLeads } from "@/lib/content";

/**
 * The expanded member panel: one dialog for the whole page, driven by whichever
 * card was clicked. Mounting a Dialog per card would put ~56 portals on
 * /council; this keeps it at one.
 *
 * `member` is null between openings — Radix animates the close transition, so
 * the last member is held in `shown` until the panel is fully gone, otherwise
 * the content would blank out mid-fade.
 */
export function CouncilMemberDialog({
  member,
  onOpenChange,
}: {
  member: CouncilMemberWithCoLeads | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [shown, setShown] = React.useState(member);
  React.useEffect(() => {
    if (member) setShown(member);
  }, [member]);

  const m = member ?? shown;

  return (
    <Dialog.Root open={Boolean(member)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Also lenis-prevented, so the wheel over the margin around the panel
            doesn't scroll the page behind it either. */}
        <Dialog.Overlay
          data-lenis-prevent
          className="fixed inset-0 z-[90] bg-bg/80 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        />
        <Dialog.Content
          aria-describedby={undefined}
          // Lenis (src/components/chrome/smooth-scroll-provider.tsx) hijacks the
          // wheel globally to drive page scroll, so without this the wheel over
          // an open panel scrolls the page behind it instead of the panel.
          // `data-lenis-prevent` is Lenis's opt-out for nested scrollers.
          data-lenis-prevent
          className="fixed inset-2 z-[100] overflow-y-auto overscroll-contain rounded-2xl border border-line/10 bg-surface data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 sm:inset-6 lg:inset-10"
        >
          {m && (
            <>
              <Dialog.Title className="sr-only">{m.name}</Dialog.Title>

              {/* Close button: sticky inside the scroll container so it stays
                  reachable after scrolling a long bio. Solid white with a dark
                  glyph, and a ring so it still reads on the light theme. */}
              <div className="pointer-events-none sticky top-0 z-20 flex justify-end p-4 sm:p-5">
                <Dialog.Close asChild>
                  <button
                    aria-label="Close"
                    className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-black/10 transition-transform duration-200 hover:scale-105 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* The sticky close row above already provides the top spacing. */}
              <div className="px-5 pb-16 sm:px-8 lg:px-12">
                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-14">
                  {/* ── Portrait ── */}
                  <div className="group/m relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line/10 bg-surface-2">
                    <MemberPortrait
                      name={m.name}
                      photo={m.photo}
                      sizes="(min-width: 1024px) 400px, 100vw"
                      priority
                    />
                  </div>

                  {/* ── Detail ── */}
                  <div className="min-w-0">
                    {/* The role is the person's title, so it uses the same sans
                        treatment as on their card — not the mono eyebrow, which
                        is reserved here for the structural labels below
                        ("What they do", "Co-leads"). Previously all three were
                        identical and the panel had no label hierarchy. */}
                    <div className="flex items-center gap-3">
                      <span className="h-px w-10 bg-line/30" aria-hidden />
                      <span className="person-role text-base">{m.role}</span>
                    </div>

                    <h2 className="person-name mt-5 break-normal text-4xl text-ink sm:text-5xl lg:text-6xl">
                      {m.name}
                    </h2>

                    {m.program && <p className="person-meta mt-4">{m.program}</p>}

                    {m.quote && (
                      <blockquote className="person-voice mt-8 text-xl text-ink sm:text-2xl">
                        &ldquo;{m.quote}&rdquo;
                      </blockquote>
                    )}

                    {m.bio && (
                      <div className="mt-10 border-t border-line/10 pt-8">
                        {/* text-muted, not text-subtle: `subtle` is 3.28:1 on
                            this surface in the dark theme — an AA failure. */}
                        <span className="kicker">What they do</span>
                        {/* max-w-xl ≈ 68ch here; max-w-2xl ran the prose to 80ch,
                            past the point where the eye reliably finds the next
                            line. */}
                        <p className="mt-4 max-w-xl whitespace-pre-line text-pretty leading-relaxed text-muted">
                          {m.bio}
                        </p>
                      </div>
                    )}

                    <MemberLinks member={m} size="lg" className="mt-10 gap-3" />
                  </div>
                </div>

                {/* ── Co-leads ── */}
                {m.coLeads.length > 0 && (
                  <div className="mt-16 border-t border-line/10 pt-10 sm:mt-20">
                    <div className="mb-8 flex items-center gap-3">
                      <span className="h-px w-10 bg-line/25" aria-hidden />
                      <h3 className="kicker text-ink">
                        {m.coLeads.length === 1 ? "Co-lead" : "Co-leads"}
                      </h3>
                    </div>
                    {/* No onOpen: a nested dialog would trap focus twice over. */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {m.coLeads.map((c, i) => (
                        <CouncilCard key={c.id} member={c} index={i} size="sm" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
