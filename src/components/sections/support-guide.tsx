"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Check,
  ExternalLink,
  HeartPulse,
  Leaf,
  LibraryBig,
  Lightbulb,
  Mail,
  MapPin,
  Plane,
  Presentation,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { GrievanceForm } from "@/components/sections/grievance-form";
import {
  grievanceRecommendation,
  searchSupportDepartments,
  type SupportDepartment,
} from "@/lib/support-directory";
import { cn } from "@/lib/utils";
import type { GrievanceCategory } from "@/lib/schemas";

type SupportGuideProps = {
  channels: unknown[];
  grievanceCategories: GrievanceCategory[];
  grievanceMailTo: string;
};

const DEPARTMENT_ICONS: Record<SupportDepartment["icon"], LucideIcon> = {
  campus: Building2,
  academic: BookOpen,
  career: BriefcaseBusiness,
  research: BrainCircuit,
  leadership: Presentation,
  startup: Lightbulb,
  international: Plane,
  sustainability: Leaf,
  wellness: HeartPulse,
  library: LibraryBig,
};

const SPOTLIGHT_SUGGESTIONS = [
  "My room AC is not working",
  "MyCAMU attendance is wrong",
  "I want to start a company",
  "I need counselling support",
  "How do I study abroad?",
  "I need help with placements",
];

export function SupportGuide({
  grievanceCategories,
  grievanceMailTo,
}: SupportGuideProps) {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const hasQuery = query.trim().length > 0;
  const results = React.useMemo(() => searchSupportDepartments(query), [query]);
  const recommendation = React.useMemo(
    () => grievanceRecommendation(query),
    [query],
  );
  const selected =
    results.find((result) => result.department.id === selectedId) ?? results[0];

  function updateQuery(value: string) {
    setQuery(value);
    setSelectedId("");
  }

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-accent selection:text-accent-ink">
      <section
        className={cn(
          "container flex min-h-[calc(100svh-11rem)] flex-col transition-[padding] duration-500",
          hasQuery
            ? "justify-start py-8 sm:py-10"
            : "justify-center py-16 sm:py-24",
        )}
      >
        <div className="mx-auto w-full max-w-6xl">
          <h1
            className={cn(
              "text-balance font-display tracking-[-0.04em] transition-[font-size,line-height] duration-500",
              hasQuery
                ? "max-w-4xl text-4xl leading-[0.95] sm:text-6xl"
                : "text-center text-[clamp(4rem,9vw,8.5rem)] leading-[0.82]",
            )}
          >
            What do you need help with?
          </h1>
          {!hasQuery && (
            <p className="mx-auto mt-8 max-w-2xl text-center text-lg text-muted">
              Describe the problem, not the department. Search Desk covers all
              11 departments in the university guide and ranks the useful
              routes.
            </p>
          )}
          <SearchField
            value={query}
            onChange={updateQuery}
            placeholder="Try: I need counselling, my room AC is broken, or I want to study abroad"
            className={cn("mt-9", !hasQuery && "mx-auto max-w-5xl sm:mt-12")}
            inputClassName={cn(
              "rounded-2xl bg-surface pl-16 pr-16 shadow-[0_24px_70px_-42px_rgb(var(--ink)/0.4)]",
              hasQuery
                ? "h-16 text-base sm:h-20 sm:text-xl"
                : "h-24 text-lg sm:h-28 sm:pl-20 sm:text-2xl",
            )}
            iconClassName={cn(
              "text-accent",
              hasQuery
                ? "left-6 h-5 w-5"
                : "left-6 h-6 w-6 sm:left-7 sm:h-7 sm:w-7",
            )}
          />

          {!hasQuery && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SPOTLIGHT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => updateQuery(suggestion)}
                  className="min-h-11 rounded-full border border-line/15 px-4 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {hasQuery && (
            <div
              className="mt-4 overflow-hidden rounded-2xl border border-line/10 bg-surface shadow-[0_22px_60px_-42px_rgb(var(--ink)/0.45)]"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/10 px-5 py-4 sm:px-6">
                <p className="text-sm font-semibold">
                  {results.length > 0
                    ? `${results.length} ${results.length === 1 ? "route" : "routes"} found`
                    : "No department matched yet"}
                </p>
              </div>

              {recommendation && (
                <a
                  href="#grievance-form"
                  className={cn(
                    "flex items-start gap-4 border-b border-line/10 px-5 py-5 sm:px-6",
                    recommendation.strength === "recommended"
                      ? "bg-accent text-accent-ink"
                      : "bg-line/[0.06] text-ink",
                  )}
                >
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {recommendation.title}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block text-sm leading-relaxed",
                        recommendation.strength === "recommended"
                          ? "text-accent-ink/75"
                          : "text-muted",
                      )}
                    >
                      {recommendation.reason}
                    </span>
                  </span>
                  <span className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-bg sm:inline-flex">
                    Fill grievance form
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </a>
              )}

              {results.length > 0 ? (
                <div className="flex flex-col lg:h-[620px] lg:max-h-[calc(100vh-14rem)] lg:flex-row">
                  <div
                    className="max-h-60 min-h-0 shrink-0 overflow-y-auto overscroll-contain border-b border-line/10 p-2 lg:h-full lg:max-h-none lg:w-[36%] lg:border-b-0 lg:border-r [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line/20 hover:[&::-webkit-scrollbar-thumb]:bg-line/40"
                    role="listbox"
                    aria-label="Matching departments"
                  >
                    {results.map((result, index) => {
                      const department = result.department;
                      const Icon = DEPARTMENT_ICONS[department.icon];
                      const isSelected =
                        selected?.department.id === department.id;
                      return (
                        <button
                          key={department.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => setSelectedId(department.id)}
                          className={cn(
                            "flex min-h-20 w-full items-center gap-4 rounded-xl px-4 text-left transition-colors",
                            isSelected
                              ? "bg-ink text-bg"
                              : "hover:bg-line/[0.06]",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 shrink-0",
                              isSelected ? "text-accent" : "text-muted",
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold">
                                {department.shortName ?? department.name}
                              </span>
                              {index === 0 && (
                                <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-accent-ink">
                                  Best match
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "mt-1 block truncate text-xs",
                                isSelected ? "text-bg/60" : "text-muted",
                              )}
                            >
                              {department.area}
                            </span>
                          </span>
                          <span className="text-xs tabular-nums opacity-45">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selected && (
                    <SpotlightDepartmentDetail
                      department={selected.department}
                      grievanceRecommended={Boolean(recommendation)}
                    />
                  )}
                </div>
              ) : (
                <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      Try the main words.
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                      Search for a topic such as hostel, MyCAMU, placement,
                      startup, exchange, health, sports, sustainability, AI, or
                      library. Small spelling mistakes are okay.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateQuery("")}
                    className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-bg"
                  >
                    Show examples
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <GrievanceSection
        id="grievance-form"
        title="Some concerns should skip the search."
        categories={grievanceCategories}
        fallbackTo={grievanceMailTo}
      />
    </div>
  );
}

function SpotlightDepartmentDetail({
  department,
  grievanceRecommended,
}: {
  department: SupportDepartment;
  grievanceRecommended: boolean;
}) {
  const Icon = DEPARTMENT_ICONS[department.icon];
  const articleRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    articleRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [department.id]);

  return (
    <article
      ref={articleRef}
      className="max-h-[600px] min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-10 sm:p-8 sm:pb-12 lg:h-full lg:max-h-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line/20 hover:[&::-webkit-scrollbar-thumb]:bg-line/40"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-accent">{department.area}</p>
          <h2 className="mt-2 text-balance font-display text-4xl leading-[0.95] sm:text-5xl">
            {department.name}
          </h2>
          {department.shortName && (
            <p className="mt-2 text-sm text-muted">
              Also known as {department.shortName}
            </p>
          )}
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        {department.overview}
      </p>
      <div className="mt-6 rounded-xl bg-bg p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
          This is the right route when
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/85">
          {department.reachOutWhen}
        </p>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold">What they handle</p>
        <ul className="mt-4 space-y-3">
          {department.responsibilities.map((responsibility) => (
            <li key={responsibility} className="flex gap-3 text-sm text-muted">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              />
              {responsibility}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 flex flex-wrap gap-2 border-t border-line/10 pt-6">
        {department.emails?.map((email) => (
          <a
            key={email}
            href={`mailto:${email}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-bg"
          >
            <Mail className="h-4 w-4 text-accent" aria-hidden />
            {email}
          </a>
        ))}
        {department.website && (
          <a
            href={department.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-bg"
          >
            <ExternalLink className="h-4 w-4 text-accent" aria-hidden />
            Open official website
          </a>
        )}
        {department.location && (
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line/15 px-4 text-xs font-medium text-muted">
            <MapPin className="h-4 w-4 text-accent" aria-hidden />
            {department.location}
          </span>
        )}
        {!department.emails && !department.website && !department.location && (
          <span className="text-xs leading-relaxed text-subtle">
            The supplied department guide does not list a direct contact for
            this desk.
          </span>
        )}
      </div>

      <a
        href="#grievance-form"
        className={cn(
          "mt-6 flex min-h-12 items-center justify-between gap-4 rounded-xl px-4 text-sm",
          grievanceRecommended
            ? "bg-accent font-semibold text-accent-ink"
            : "bg-line/[0.06] text-muted hover:text-ink",
        )}
      >
        <span>
          {grievanceRecommended
            ? "Fill the grievance form for this issue"
            : "If this is sensitive or remains unresolved, use the grievance form"}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </a>
    </article>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  iconClassName,
  clearClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  clearClassName?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2",
          iconClassName,
        )}
        aria-hidden
      />
      <label className="sr-only">Describe what you need help with</label>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full border border-line/15 text-ink outline-none placeholder:text-subtle focus:border-accent",
          inputClassName,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-line/10 hover:text-ink",
            clearClassName,
          )}
          aria-label="Clear search"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function GrievanceSection({
  id,
  title,
  categories,
  fallbackTo,
}: {
  id: string;
  title: string;
  categories: GrievanceCategory[];
  fallbackTo: string;
}) {
  return (
    <section
      id={id}
      className="border-t border-line/10 bg-surface py-20 sm:py-24"
    >
      <div className="container grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <ShieldCheck className="h-9 w-9 text-accent" aria-hidden />
          <h2 className="mt-7 max-w-xl font-display text-5xl leading-[0.92] sm:text-7xl">
            {title}
          </h2>
          <p className="mt-6 max-w-md text-muted">
            This form prepares an Outlook message to the configured grievance
            inbox. You can review it before sending.
          </p>
          <a
            href="#content"
            className="mt-8 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-accent"
          >
            Back to Search Desk{" "}
            <ArrowDown className="h-4 w-4 rotate-180" aria-hidden />
          </a>
        </div>
        <GrievanceForm categories={categories} fallbackTo={fallbackTo} />
      </div>
    </section>
  );
}
