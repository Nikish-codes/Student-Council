/**
 * THESIS: Today is a service sequence, not a miniature weekly spreadsheet.
 * OWN-WORLD: WSC ink, paper, red, Fraunces display, precise hairlines and numbered stops.
 * STORY: Confirm the date, scan the three service windows, then read category and diet detail.
 * FIRST VIEWPORT: Today's date and disclosure lead directly into the first numbered meal stop.
 * FORM: Selected concept 3, Service line; inherited Option 3 staging and seed 35d872d2.
 */

import { AlertCircle, Check, Clock3, UtensilsCrossed } from "lucide-react";

import type { DbOvalMenuDay, OvalDiet, OvalMealId, OvalMenuItem } from "@/db/schema";
import {
  OVAL_MEALS,
  type OvalMealPhase,
  formatOvalDate,
} from "@/lib/oval-menu";
import { cn } from "@/lib/utils";

const DIETS: Record<
  OvalDiet,
  { short: string; label: string; className: string; square?: boolean }
> = {
  veg: {
    short: "V",
    label: "Vegetarian",
    className: "border-emerald-500/45 text-emerald-500",
  },
  egg: {
    short: "E",
    label: "Contains egg",
    className: "border-amber-500/50 text-amber-500",
  },
  nonveg: {
    short: "NV",
    label: "Non-vegetarian",
    className: "border-rose-500/50 text-rose-500",
    square: true,
  },
};

function DietMark({ diet, compact = false }: { diet: OvalDiet; compact?: boolean }) {
  const config = DIETS[diet];
  return (
    <span className={cn("inline-flex items-center gap-1.5", config.className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center border font-bold",
          compact ? "h-3.5 w-3.5 text-[0px]" : "h-4 min-w-4 px-0.5 text-[8px]",
          config.square ? "rounded-[3px]" : "rounded-full",
        )}
      >
        {compact ? "" : config.short}
      </span>
      <span className={compact ? "sr-only" : ""}>{config.label}</span>
    </span>
  );
}
function phaseCopy(phase: OvalMealPhase) {
  if (phase === "serving") return "Serving now";
  if (phase === "upcoming") return "Up next";
  if (phase === "completed") return "Service completed";
  return "Later today";
}

function MenuItemRow({ item }: { item: OvalMenuItem }) {
  return (
    <li className="grid gap-2 border-b border-line/10 py-4 last:border-b-0 sm:grid-cols-[minmax(130px,0.7fr)_1.3fr] sm:gap-8">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-subtle">
        {item.category}
      </span>
      <span className="flex items-start gap-2.5 text-sm leading-snug text-ink">
        <span className="mt-0.5 flex shrink-0 gap-1">
          {item.diets.map((diet) => (
            <DietMark key={diet} diet={diet} compact />
          ))}
        </span>
        {item.dish}
      </span>
    </li>
  );
}

export function OvalDailyMenu({
  serviceDate,
  day,
  phases,
}: {
  serviceDate: string;
  day: DbOvalMenuDay | null;
  phases: Record<OvalMealId, OvalMealPhase>;
}) {
  const dateLabel = formatOvalDate(serviceDate);
  return (
    <div className="pb-28 pt-32 sm:pt-40">
      <section className="container">
        <header className="grid gap-8 border-b border-line/15 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <UtensilsCrossed className="h-4 w-4 text-accent" />
              <span>Oval mess</span>
              <span aria-hidden>·</span>
              <span>Today&apos;s menu</span>
            </div>
            <h1 className="display mt-5 max-w-5xl text-5xl/[0.92] sm:text-7xl/[0.9]">
              {dateLabel.split(",")[0]},
              <span className="italic text-accent">
                {dateLabel.slice(dateLabel.indexOf(",") + 1)}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-muted">
              Breakfast, lunch, and dinner for this service day. The public page
              changes automatically at 4:00 AM.
            </p>
          </div>
          <div className="border-l border-line/20 pl-5 text-sm text-muted">
            <p className="font-medium text-ink">Three services</p>
            <p className="mt-1">One verified daily menu</p>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line/10 py-4 text-xs text-muted">
          <span className="font-medium text-ink">Diet markers</span>
          <DietMark diet="veg" />
          <DietMark diet="egg" />
          <DietMark diet="nonveg" />
          <span className="ml-auto hidden text-subtle sm:inline">
            Only today&apos;s approved menu is public
          </span>
        </div>

        {!day ? (
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="mb-12 flex items-start gap-4 border-y border-line/15 py-6">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h2 className="font-medium text-ink">Today&apos;s menu is awaiting confirmation</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  The Food Committee has not approved this service day yet. Nothing
                  from another day is shown in its place.
                </p>
              </div>
            </div>
            <ServiceLine meals={null} phases={phases} />
          </div>
        ) : (
          <div className="mx-auto mt-16 max-w-5xl">
            <ServiceLine meals={day.meals} phases={phases} />
            <p className="mt-14 border-t border-line/10 pt-5 text-xs text-subtle">
              Approved menu · Last updated {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
              }).format(new Date(day.updatedAt))}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ServiceLine({
  meals,
  phases,
}: {
  meals: DbOvalMenuDay["meals"] | null;
  phases: Record<OvalMealId, OvalMealPhase>;
}) {
  return (
    <div className="relative">
      <div
        className="absolute bottom-0 left-[21px] top-2 w-px bg-line/20 sm:left-[31px]"
        aria-hidden
      />
      {OVAL_MEALS.map((meal, index) => {
        const phase = phases[meal.id];
        const active = phase === "serving" || phase === "upcoming";
        const items = meals?.[meal.id] ?? [];
        return (
          <article
            key={meal.id}
            className="relative grid gap-6 pb-16 pl-16 sm:grid-cols-[190px_1fr] sm:gap-12 sm:pl-24 last:pb-0"
          >
            <span
              className={cn(
                "absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full border bg-bg text-sm font-semibold sm:h-16 sm:w-16",
                active
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line/25 text-ink",
              )}
            >
              {phase === "completed" ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div>
              <h2 className="display text-3xl sm:text-4xl">{meal.label}</h2>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Clock3 className="h-3.5 w-3.5" />
                {meal.time}
              </p>
              <span
                className={cn(
                  "mt-4 inline-flex text-xs font-medium",
                  active ? "text-accent" : "text-subtle",
                )}
              >
                {phaseCopy(phase)}
              </span>
            </div>
            <div className="border-y border-line/10">
              {items.length ? (
                <ul>
                  {items.map((item) => (
                    <MenuItemRow key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <p className="py-7 text-sm text-subtle">
                  Menu details are not confirmed.
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
