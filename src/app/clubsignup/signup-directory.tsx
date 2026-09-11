"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CircleAlert,
  Search,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Picture } from "@/components/ui/picture";
import type { Club, ClubCategory } from "@/lib/schemas";
import {
  CLUB_APPLY_CONFIRM_KEY,
  CLUB_APPLY_LIMIT,
  CLUB_APPLY_STORAGE_KEY,
  clubApplyState,
  parseClubApplies,
  type ClubApplyEntry,
  matchesClubSearch,
  registrationLink,
} from "@/lib/club-signup";

function readApplies(): ClubApplyEntry[] {
  try {
    const raw = localStorage.getItem(CLUB_APPLY_STORAGE_KEY);
    return parseClubApplies(raw ? JSON.parse(raw) : null);
  } catch {
    return [];
  }
}

export function ClubSignupDirectory({
  clubs,
  categories,
}: {
  clubs: Club[];
  categories: ClubCategory[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [applies, setApplies] = useState<ClubApplyEntry[]>([]);
  const [confirmSeen, setConfirmSeen] = useState(false);
  const [pending, setPending] = useState<Club | null>(null);
  useEffect(() => {
    setApplies(readApplies());
    try {
      setConfirmSeen(localStorage.getItem(CLUB_APPLY_CONFIRM_KEY) === "1");
    } catch {
      return;
    }
  }, []);
  const limitReached = applies.length >= CLUB_APPLY_LIMIT;
  const applyToClub = (club: Club) => {
    if (applies.some((entry) => entry.slug === club.slug)) return;
    const next = parseClubApplies([
      ...applies,
      { slug: club.slug, name: club.name, at: Date.now() },
    ]);
    try {
      localStorage.setItem(CLUB_APPLY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      return;
    }
    setApplies(next);
  };
  const onApplyClick = (club: Club, event: React.MouseEvent) => {
    if (confirmSeen) {
      applyToClub(club);
      return;
    }
    event.preventDefault();
    setPending(club);
  };
  const cancelPending = useCallback(() => setPending(null), []);
  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPending(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);
  const confirmPending = () => {
    const club = pending;
    cancelPending();
    if (!club) return;
    try {
      localStorage.setItem(CLUB_APPLY_CONFIRM_KEY, "1");
    } catch {
      return;
    }
    setConfirmSeen(true);
    applyToClub(club);
    const link = registrationLink(club.joinUrl);
    if (link) window.location.assign(link);
  };
  const visible = clubs
    .filter(
      (club) =>
        (!category || club.categoryId === category) &&
        (!readyOnly || registrationLink(club.joinUrl)) &&
        matchesClubSearch(club, query),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const reset = () => {
    setQuery("");
    setCategory("");
    setReadyOnly(false);
  };
  return (
    <>
      <div className="sticky top-0 z-20 border-b border-line/10 bg-bg pb-3 pt-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted"
            />
            <label htmlFor="club-search" className="sr-only">
              Search clubs by name or interest
            </label>
            <input
              id="club-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a club or interest…"
              className="h-12 w-full rounded-xl border border-line/20 bg-surface-2 pl-10 pr-12 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  document.getElementById("club-search")?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <label className="sr-only" htmlFor="club-category">
            Filter by category
          </label>
          <select
            id="club-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-xl border border-line/20 bg-surface-2 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent sm:h-12 sm:max-w-64"
          >
            <option value="">All interests</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted sm:text-sm">
          <p role="status" aria-live="polite" aria-atomic="true">
            {visible.length} of {clubs.length} clubs
            {query ? ` matching “${query}”` : ""}
          </p>
          <label className="flex min-h-8 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={readyOnly}
              onChange={(e) => setReadyOnly(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Ready to apply
          </label>
        </div>
        <p
          role="status"
          aria-live="polite"
          className={
            "mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed sm:text-sm " +
            (limitReached
              ? "border-accent/40 bg-accent/10 text-ink"
              : "border-line/20 bg-surface/60 text-muted")
          }
        >
          <CircleAlert
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-accent"
          />
          {limitReached ? (
            <span>
              You&rsquo;ve used all your chances. The clubs you applied to stay
              open, and all other Apply buttons are locked.
            </span>
          ) : applies.length === CLUB_APPLY_LIMIT - 1 ? (
            <span>Fine, you can do one more!</span>
          ) : applies.length === 1 ? (
            <span>Be mindful! You only have 1 chance left!</span>
          ) : (
            <span>
              You can only click Apply now for {CLUB_APPLY_LIMIT - 1} clubs. Be
              mindful and pick the clubs that matter to you!
            </span>
          )}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted sm:text-xs">
          Nothing is submitted on this page. Each club&rsquo;s form does its own
          submitting.
        </p>
      </div>
      {visible.length ? (
        <div className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((club) => {
            const link = registrationLink(club.joinUrl);
            return (
              <article
                key={club.slug}
                className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] content-start gap-x-3 gap-y-1.5 rounded-xl border border-line/10 bg-surface/40 p-3"
              >
                <div className="row-span-2 h-10 w-10 overflow-hidden rounded-lg bg-surface-2">
                  <Picture
                    src={club.logo}
                    alt=""
                    width={88}
                    height={88}
                    sizes="44px"
                    className="h-full w-full object-contain"
                    fallbackLabel={club.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")}
                  />
                </div>
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <h2 className="min-w-0 self-center break-words text-sm font-semibold leading-snug sm:text-base">
                    {club.name}
                  </h2>
                  {link ? (
                    clubApplyState(applies, club.slug) === "applied" ? (
                      <a
                        href={link}
                        title="You used one of your chances. Nothing was submitted here; each club's form has its own Submit button."
                        aria-label={`Form opened for ${club.name}. Reopen the form.`}
                        className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 text-xs font-semibold text-accent transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        Form opened <Check aria-hidden className="h-3 w-3" />
                      </a>
                    ) : clubApplyState(applies, club.slug) === "blocked" ? (
                      <button
                        type="button"
                        disabled
                        title="You have used all your chances"
                        aria-label={`Apply to ${club.name} (all chances used)`}
                        className="inline-flex min-h-8 shrink-0 cursor-not-allowed items-center gap-1 rounded-md bg-accent/35 px-2 text-xs font-semibold text-bg opacity-70"
                      >
                        Apply now
                      </button>
                    ) : (
                      <a
                        href={link}
                        onClick={(event) => onApplyClick(club, event)}
                        aria-label={`Apply to ${club.name}`}
                        className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md bg-accent px-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        Apply now <ArrowUpRight aria-hidden className="h-3 w-3" />
                      </a>
                    )
                  ) : (
                    <span className="max-w-16 shrink-0 self-center text-right text-[11px] leading-snug text-muted">
                      Link coming soon
                    </span>
                  )}
                </div>
                <p className="col-start-2 break-words text-xs leading-relaxed text-muted sm:text-sm">
                  {club.blurb}
                </p>
                {pending?.slug === club.slug && (
                  <div
                    role="dialog"
                    aria-label={`Confirm opening the ${club.name} signup form`}
                    className="absolute left-2 right-2 top-14 z-30 rounded-xl border border-line/20 bg-surface p-3 shadow-lg shadow-black/25"
                  >
                    <p className="text-xs font-semibold sm:text-sm">
                      Open the {club.name} form?
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted sm:text-xs">
                      This opens {club.name}&rsquo;s form and uses 1 of your
                      chances. Only the club&rsquo;s own form submits anything.
                    </p>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        autoFocus
                        onClick={confirmPending}
                        className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg bg-accent px-3 text-xs font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        Open form <ArrowUpRight aria-hidden className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelPending}
                        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line/20 px-3 text-xs font-medium transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      Asked once per device. Cancel opens nothing and spends
                      nothing.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <h2 className="text-lg font-semibold">No clubs found</h2>
          <p className="mt-2 text-sm text-muted">
            Try a club name, an interest, or clear the filters.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 min-h-11 rounded-lg border border-line/20 px-4 text-sm font-medium hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent"
          >
            Show all clubs
          </button>
        </div>
      )}
    </>
  );
}
