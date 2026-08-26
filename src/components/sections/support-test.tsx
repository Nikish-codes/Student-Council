"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  CornerDownLeft,
  DoorOpen,
  HeartPulse,
  Leaf,
  LibraryBig,
  ListFilter,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircleMore,
  Plane,
  Presentation,
  Search,
  ShieldCheck,
  Sparkles,
  ExternalLink,
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
import type { GrievanceCategory, SupportChannel } from "@/lib/schemas";

type SupportTestProps = {
  channels: SupportChannel[];
  grievanceCategories: GrievanceCategory[];
  grievanceMailTo: string;
};

type ConceptId = "spotlight" | "split" | "command" | "index" | "conversation";

const CONCEPTS: Array<{ id: ConceptId; name: string }> = [
  { id: "spotlight", name: "Spotlight" },
  { id: "split", name: "Split desk" },
  { id: "command", name: "Command desk" },
  { id: "index", name: "Support index" },
  { id: "conversation", name: "Ask Council" },
];

const SUGGESTIONS = [
  "My room needs maintenance",
  "My attendance is incorrect",
  "I need placement guidance",
  "I want to raise a grievance",
];

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  DoorOpen,
  BookOpen,
  Briefcase: BriefcaseBusiness,
  BriefcaseBusiness,
  ShieldAlert: ShieldCheck,
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

const FALLBACK_CHANNELS: SupportChannel[] = [
  {
    id: "gateway",
    name: "Gateway",
    purpose: "Hostel, mess, transport & campus facilities",
    description:
      "Room, mess, transport, housekeeping, maintenance, and day-to-day campus life concerns.",
    icon: "DoorOpen",
    ownedBy: "Corporate Office",
    bring: [
      "Your room or block details",
      "A clear description or photos",
      "When the issue started",
    ],
    councilRole:
      "We can point you to the relevant warden, supervisor, or operations contact and follow up if the request stalls.",
  },
  {
    id: "bridge",
    name: "Bridge",
    purpose: "Faculty access, exams, attendance & academics",
    description:
      "Faculty meetings, exams, attendance, registration, grading, and school-office questions.",
    icon: "BookOpen",
    ownedBy: "Corporate Office",
    bring: [
      "Your roll number and programme",
      "The faculty member or course",
      "Any prior emails or screenshots",
    ],
    councilRole:
      "We can help frame the request, identify the right office, and involve an academic representative when needed.",
  },
  {
    id: "career-connect",
    name: "Career Connect",
    purpose: "Internships, placements & career preparation",
    description:
      "Internship and placement questions, career preparation, and guidance on the next useful conversation.",
    icon: "Briefcase",
    ownedBy: "Career Services Office",
    bring: [
      "Your current CV",
      "A specific question",
      "Target roles or sectors",
    ],
    councilRole:
      "We can help you identify useful introductions and the right Career Services conversation.",
  },
];

function channelIcon(channel: SupportChannel) {
  return CHANNEL_ICONS[channel.icon] ?? CircleHelp;
}

function searchChannels(channels: SupportChannel[], query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return channels;

  return channels.filter((channel, index) => {
    const aliases =
      index === 0
        ? "room hostel ac wifi mess food bus transport laundry housekeeping maintenance facility"
        : index === 1
          ? "class course professor faculty marks grade grading exam attendance registration timetable academic"
          : "job cv resume internship placement interview career company recruiter";
    return [
      channel.name,
      channel.purpose,
      channel.description,
      channel.ownedBy,
      channel.councilRole,
      ...channel.bring,
      aliases,
    ]
      .join(" ")
      .toLowerCase()
      .includes(value);
  });
}

function isGrievanceQuery(query: string) {
  return /harass|discrimin|griev|sensitive|misconduct|unsafe|complaint|bully/.test(
    query.toLowerCase(),
  );
}

function useSearch(channels: SupportChannel[]) {
  const [query, setQuery] = React.useState("");
  const results = React.useMemo(
    () => searchChannels(channels, query),
    [channels, query],
  );
  return { query, setQuery, results, grievance: isGrievanceQuery(query) };
}

export function SupportTest(props: SupportTestProps) {
  const [active, setActive] = React.useState<ConceptId>("spotlight");
  const resolvedProps = {
    ...props,
    channels: props.channels.length ? props.channels : FALLBACK_CHANNELS,
  };

  React.useEffect(() => {
    const hash = window.location.hash.slice(1) as ConceptId;
    if (CONCEPTS.some((concept) => concept.id === hash)) setActive(hash);
  }, []);

  function choose(id: ConceptId) {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-bg pt-24 text-ink sm:pt-28">
      <div className="sticky top-[78px] z-40 border-y border-line/10 bg-bg/95 backdrop-blur-xl sm:top-[94px]">
        <div className="container flex min-h-20 items-center gap-4 py-3">
          <div className="hidden min-w-40 lg:block">
            <p className="text-sm font-semibold text-ink">Search Desk</p>
            <p className="text-xs text-muted">Five visual directions</p>
          </div>
          <div
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Search Desk concepts"
          >
            {CONCEPTS.map((concept, index) => (
              <button
                key={concept.id}
                type="button"
                role="tab"
                aria-selected={active === concept.id}
                onClick={() => choose(concept.id)}
                className={cn(
                  "min-h-12 shrink-0 rounded-xl px-4 text-left transition-colors",
                  active === concept.id
                    ? "bg-ink text-bg"
                    : "bg-line/[0.04] text-muted hover:bg-line/[0.08] hover:text-ink",
                )}
              >
                <span className="mr-2 text-xs tabular-nums opacity-60">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{concept.name}</span>
              </button>
            ))}
          </div>
          <p className="hidden text-right text-xs leading-relaxed text-muted xl:block">
            Same content
            <br />
            Different search experience
          </p>
        </div>
      </div>

      <main role="tabpanel">
        {active === "spotlight" && <SpotlightDesk {...resolvedProps} />}
        {active === "split" && <SplitDesk {...resolvedProps} />}
        {active === "command" && <CommandDesk {...resolvedProps} />}
        {active === "index" && <IndexDesk {...resolvedProps} />}
        {active === "conversation" && <ConversationDesk {...resolvedProps} />}
      </main>
    </div>
  );
}

function SpotlightDesk({
  grievanceCategories,
  grievanceMailTo,
}: SupportTestProps) {
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
    <div className="selection:bg-accent selection:text-accent-ink">
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
                <p className="text-xs text-muted">
                  Results appear here as you type — no scrolling required
                </p>
              </div>

              {recommendation && (
                <a
                  href="#spotlight-grievance"
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
                <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
                  <div
                    className="max-h-56 overflow-y-auto border-b border-line/10 p-2 lg:max-h-[460px] lg:border-b-0 lg:border-r"
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
        id="spotlight-grievance"
        title="A direct route for sensitive concerns."
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
  return (
    <article className="max-h-[560px] overflow-y-auto p-6 sm:p-8 lg:max-h-[460px]">
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
        href="#spotlight-grievance"
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

function SplitDesk({
  channels,
  grievanceCategories,
  grievanceMailTo,
}: SupportTestProps) {
  const { query, setQuery, results, grievance } = useSearch(channels);
  const [selectedId, setSelectedId] = React.useState(channels[0]?.id ?? "");
  const selected =
    results.find((channel) => channel.id === selectedId) ?? results[0];

  return (
    <div className="selection:bg-accent selection:text-accent-ink">
      <section className="container grid min-h-[calc(100svh-11rem)] gap-0 py-12 lg:grid-cols-[0.78fr_1.22fr] lg:py-20">
        <div className="flex flex-col border-line/10 pb-10 lg:border-r lg:pb-0 lg:pr-10">
          <h1 className="max-w-xl font-sans text-[clamp(3.4rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.04em]">
            Search on the left. Get the route on the right.
          </h1>
          <p className="mt-6 max-w-md text-muted">
            Compare possible routes without losing the search that got you
            there.
          </p>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="What happened?"
            className="mt-10"
            inputClassName="h-16 rounded-xl bg-surface pl-14 pr-14 text-base"
            iconClassName="left-5 h-5 w-5 text-accent"
          />
          <div className="mt-5 space-y-2">
            {results.map((channel) => {
              const Icon = channelIcon(channel);
              const selectedRoute = selected?.id === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedId(channel.id)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-4 rounded-xl px-4 text-left transition-colors",
                    selectedRoute
                      ? "bg-ink text-bg"
                      : "bg-line/[0.04] text-ink hover:bg-line/[0.08]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      selectedRoute ? "text-accent" : "text-muted",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{channel.name}</span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-xs",
                        selectedRoute ? "text-bg/60" : "text-muted",
                      )}
                    >
                      {channel.purpose}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              );
            })}
            {grievance && (
              <a
                href="#split-grievance"
                className="flex min-h-16 items-center gap-4 rounded-xl bg-accent px-4 text-accent-ink"
              >
                <ShieldCheck className="h-5 w-5" aria-hidden />
                <span className="flex-1 font-semibold">Grievance support</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
          {query && results.length === 0 && !grievance && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-5 min-h-12 rounded-xl border border-line/15 px-5 text-sm font-medium"
            >
              No match. Clear search
            </button>
          )}
        </div>
        <div className="pt-10 lg:pl-12 lg:pt-0">
          {selected ? (
            <RouteAnswer channel={selected} />
          ) : (
            <div className="grid min-h-96 place-items-center rounded-2xl bg-surface p-10 text-center text-muted">
              Search for a topic to see its support route.
            </div>
          )}
        </div>
      </section>

      <GrievanceSection
        id="split-grievance"
        title="Some concerns should skip the search."
        categories={grievanceCategories}
        fallbackTo={grievanceMailTo}
      />
    </div>
  );
}

function CommandDesk({
  channels,
  grievanceCategories,
  grievanceMailTo,
}: SupportTestProps) {
  const { query, setQuery, results, grievance } = useSearch(channels);
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <div className="selection:bg-accent selection:text-accent-ink">
      <section className="container py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="max-w-3xl font-sans text-[clamp(3.6rem,8vw,8rem)] font-bold leading-[0.85] tracking-[-0.04em]">
              Fast answers, minus the portal maze.
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Command className="h-4 w-4" aria-hidden /> Search Desk
            </div>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl bg-ink text-bg shadow-[0_28px_80px_-46px_rgb(var(--ink)/0.55)]">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search support…"
              className="border-b border-bg/10 p-4 sm:p-5"
              inputClassName="h-16 rounded-xl border-bg/10 bg-bg/[0.08] pl-14 pr-14 text-lg text-bg placeholder:text-bg/40 focus:border-accent"
              iconClassName="left-9 h-5 w-5 text-accent sm:left-10"
              clearClassName="right-9 text-bg/60 sm:right-10"
            />

            {!query && (
              <div className="border-b border-bg/10 px-5 py-4 sm:px-7">
                <p className="text-xs font-semibold text-bg/45">
                  QUICK SEARCHES
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="min-h-11 rounded-full bg-bg/[0.08] px-4 text-sm text-bg/75 hover:bg-bg/[0.14] hover:text-bg"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 sm:p-4">
              {results.map((channel) => {
                const Icon = channelIcon(channel);
                const open = openId === channel.id;
                return (
                  <div key={channel.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : channel.id)}
                      className={cn(
                        "flex min-h-20 w-full items-center gap-4 rounded-xl px-4 text-left transition-colors",
                        open ? "bg-bg text-ink" : "hover:bg-bg/[0.07]",
                      )}
                      aria-expanded={open}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          open ? "text-accent" : "text-bg/50",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {channel.name}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block truncate text-sm",
                            open ? "text-muted" : "text-bg/55",
                          )}
                        >
                          {channel.purpose}
                        </span>
                      </span>
                      <CornerDownLeft
                        className="h-4 w-4 shrink-0 opacity-45"
                        aria-hidden
                      />
                    </button>
                    {open && (
                      <div className="mx-4 mb-3 grid gap-6 rounded-b-xl bg-bg px-6 pb-7 text-ink sm:grid-cols-2">
                        <p className="text-sm leading-relaxed text-muted">
                          {channel.description}
                        </p>
                        <RouteChecklist channel={channel} compact />
                      </div>
                    )}
                  </div>
                );
              })}
              {grievance && (
                <a
                  href="#command-grievance"
                  className="flex min-h-20 items-center gap-4 rounded-xl bg-accent px-4 text-accent-ink"
                >
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                  <span className="flex-1 font-semibold">
                    Open grievance support
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              )}
              {query && results.length === 0 && !grievance && (
                <div className="p-8 text-center text-bg/60">
                  No exact route found. Try a shorter search.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-bg/10 px-5 py-4 text-xs text-bg/45 sm:px-7">
              <span>{results.length} support routes shown</span>
              <span>Enter to explore</span>
            </div>
          </div>
        </div>
      </section>

      <GrievanceSection
        id="command-grievance"
        title="The direct command for sensitive concerns."
        categories={grievanceCategories}
        fallbackTo={grievanceMailTo}
      />
    </div>
  );
}

function IndexDesk({
  channels,
  grievanceCategories,
  grievanceMailTo,
}: SupportTestProps) {
  const { query, setQuery, results, grievance } = useSearch(channels);

  return (
    <div className="selection:bg-accent selection:text-accent-ink">
      <section className="container py-14 sm:py-20">
        <div className="grid gap-12 border-b border-line/10 pb-14 lg:grid-cols-2 lg:items-end">
          <h1 className="font-display text-[clamp(4.2rem,10vw,10rem)] leading-[0.8] tracking-[-0.04em]">
            The support index.
          </h1>
          <div className="lg:pb-3">
            <p className="max-w-lg text-lg text-muted">
              A browsable, search-led directory for students who want the whole
              picture without a stack of cards.
            </p>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search the index"
              className="mt-7"
              inputClassName="h-14 rounded-none border-x-0 border-t-0 bg-transparent pl-11 pr-12 text-lg focus:border-accent"
              iconClassName="left-2 h-5 w-5 text-accent"
              clearClassName="right-2"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-5">
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <ListFilter className="h-4 w-4" aria-hidden />
            {query ? `Filtered by “${query}”` : "All student support"}
          </span>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="min-h-11 px-2 text-sm font-semibold text-accent"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="mt-5 border-t border-line/15">
          {results.map((channel, index) => {
            const Icon = channelIcon(channel);
            return (
              <article
                key={channel.id}
                className="grid gap-7 border-b border-line/15 py-9 lg:grid-cols-[0.15fr_0.55fr_1.3fr] lg:py-12"
              >
                <div className="flex items-center gap-4 lg:items-start">
                  <span className="font-mono text-xs text-subtle">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon className="h-5 w-5 text-accent" aria-hidden />
                </div>
                <div>
                  <h2 className="font-display text-4xl sm:text-5xl">
                    {channel.name}
                  </h2>
                  <p className="mt-3 max-w-sm text-sm font-medium text-ink/80">
                    {channel.purpose}
                  </p>
                </div>
                <div className="grid gap-7 sm:grid-cols-2">
                  <div>
                    <p className="text-sm leading-relaxed text-muted">
                      {channel.description}
                    </p>
                    <p className="mt-5 text-sm leading-relaxed text-muted">
                      <span className="font-semibold text-ink">
                        If it stalls:{" "}
                      </span>
                      {channel.councilRole}
                    </p>
                  </div>
                  <RouteChecklist channel={channel} compact />
                </div>
              </article>
            );
          })}
          {grievance && (
            <a
              href="#index-grievance"
              className="grid gap-7 border-b border-line/15 bg-accent px-6 py-9 text-accent-ink lg:grid-cols-[0.15fr_0.55fr_1.3fr] lg:py-12"
            >
              <ShieldCheck className="h-5 w-5" aria-hidden />
              <span className="font-display text-4xl sm:text-5xl">
                Grievance
              </span>
              <span className="flex items-center justify-between gap-5 text-sm font-medium">
                Sensitive concerns, harassment, discrimination, or misconduct
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
              </span>
            </a>
          )}
        </div>

        {query && results.length === 0 && !grievance && (
          <EmptyResult onReset={() => setQuery("")} />
        )}
      </section>

      <GrievanceSection
        id="index-grievance"
        title="The concern that does not belong in a directory."
        categories={grievanceCategories}
        fallbackTo={grievanceMailTo}
      />
    </div>
  );
}

function ConversationDesk({
  channels,
  grievanceCategories,
  grievanceMailTo,
}: SupportTestProps) {
  const { query, setQuery, results, grievance } = useSearch(channels);
  const hasAsked = query.trim().length > 0;

  return (
    <div className="selection:bg-accent selection:text-accent-ink">
      <section className="container py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start gap-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
              <MessageCircleMore className="h-5 w-5" aria-hidden />
            </span>
            <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-surface p-6 sm:p-8">
              <h1 className="font-sans text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Hi. What can we help you figure out?
              </h1>
              <p className="mt-4 text-muted">
                Say it naturally. You do not need to know which office handles
                it.
              </p>
            </div>
          </div>

          {!hasAsked && (
            <div className="ml-0 mt-8 grid gap-3 sm:ml-16 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="min-h-16 rounded-2xl border border-line/10 bg-bg px-5 text-left text-sm font-medium hover:border-accent hover:bg-surface"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {hasAsked && (
            <div className="mt-10 space-y-7">
              <div className="ml-auto max-w-2xl rounded-2xl rounded-tr-sm bg-ink p-6 text-bg">
                {query}
              </div>
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-4 text-sm text-muted">
                    {results.length || grievance
                      ? "These are the closest support routes."
                      : "That did not match a specific route yet."}
                  </p>
                  <div className="space-y-3">
                    {results.map((channel) => (
                      <ConversationResult key={channel.id} channel={channel} />
                    ))}
                    {grievance && (
                      <GrievanceResult href="#conversation-grievance" />
                    )}
                    {results.length === 0 && !grievance && (
                      <div className="rounded-2xl bg-surface p-6 text-muted">
                        Try fewer words, or choose one of the common questions
                        below.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="sticky bottom-5 mt-12 rounded-2xl border border-line/10 bg-bg/95 p-3 shadow-[0_18px_50px_-34px_rgb(var(--ink)/0.5)] backdrop-blur-xl">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Type what happened…"
              inputClassName="h-16 rounded-xl border-0 bg-surface pl-14 pr-14 text-base"
              iconClassName="left-5 h-5 w-5 text-accent"
            />
          </div>
        </div>
      </section>

      <GrievanceSection
        id="conversation-grievance"
        title="When search is not the right first step."
        categories={grievanceCategories}
        fallbackTo={grievanceMailTo}
      />
    </div>
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

function RouteAnswer({ channel }: { channel: SupportChannel }) {
  const Icon = channelIcon(channel);
  return (
    <article className="flex min-h-[600px] flex-col rounded-2xl bg-surface p-7 sm:p-10">
      <div className="flex items-center justify-between gap-6">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-accent text-accent-ink">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <span className="rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold text-muted">
          Best match
        </span>
      </div>
      <h2 className="mt-10 font-display text-6xl sm:text-8xl">
        {channel.name}
      </h2>
      <p className="mt-4 max-w-xl text-lg font-medium text-ink/80">
        {channel.purpose}
      </p>
      <p className="mt-7 max-w-2xl leading-relaxed text-muted">
        {channel.description}
      </p>
      <div className="mt-10 grid gap-8 border-t border-line/10 pt-8 sm:grid-cols-2">
        <RouteChecklist channel={channel} />
        <p className="rounded-xl bg-bg p-5 text-sm leading-relaxed text-muted">
          <span className="font-semibold text-ink">If it stalls: </span>
          {channel.councilRole}
        </p>
      </div>
    </article>
  );
}

function RouteChecklist({
  channel,
  compact = false,
}: {
  channel: SupportChannel;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">Useful details to have ready</p>
      <ul className={cn("space-y-3", compact ? "mt-3" : "mt-5")}>
        {channel.bring.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-muted">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConversationResult({ channel }: { channel: SupportChannel }) {
  const Icon = channelIcon(channel);
  return (
    <details className="group rounded-2xl bg-surface">
      <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 px-5 [&::-webkit-details-marker]:hidden">
        <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{channel.name}</span>
          <span className="mt-1 block truncate text-sm text-muted">
            {channel.purpose}
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-line/10 px-5 pb-6 pt-5">
        <p className="text-sm leading-relaxed text-muted">
          {channel.description}
        </p>
        <div className="mt-5">
          <RouteChecklist channel={channel} compact />
        </div>
      </div>
    </details>
  );
}

function GrievanceResult({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="flex min-h-24 items-center gap-5 rounded-xl bg-accent px-5 text-accent-ink"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-bg">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold">Grievance support</span>
        <span className="mt-1 block text-sm text-accent-ink/75">
          Harassment, discrimination, misconduct, or another sensitive concern
        </span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
    </a>
  );
}

function EmptyResult({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-8 rounded-2xl bg-surface p-8 sm:p-12">
      <CircleHelp className="h-8 w-8 text-accent" aria-hidden />
      <h3 className="mt-6 text-3xl font-semibold">No exact route yet.</h3>
      <p className="mt-3 max-w-xl text-muted">
        Try fewer words, browse all routes, or use the grievance form when the
        issue is sensitive.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-7 min-h-11 rounded-full bg-ink px-5 font-semibold text-bg"
      >
        Show every route
      </button>
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
