---
target: the Council page typography and overall design
total_score: 17
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 4
timestamp: 2026-08-14T14-10-03Z
slug: src-app-site-council-page-tsx
---
# Council Page Design Critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Dialog and accordion states are clear, but cards do not strongly advertise that they open and the moving club track has no position/status cue. |
| 2 | Match with the real world | 3 | Real people, roles, programmes, and contact routes are prominent; inconsistent programme formatting weakens the directory language. |
| 3 | User control and freedom | 2 | The auto-scrolling club track can be paused or dragged, but the 64-person page has no jump navigation, search, or filter. |
| 4 | Consistency and standards | 2 | The site typography is coherent by itself, but poster artwork embeds another name/title/logo system that is repeated by the card UI. |
| 5 | Error prevention | 3 | Shared dialog and link handling avoid nested-interaction errors; some keyboard focus and duplicated-track problems remain. |
| 6 | Recognition rather than recall | 2 | Names and roles are visible, but finding one representative requires remembering section order and scanning a very long page. |
| 7 | Flexibility and efficiency | n/a | This is primarily an editorial directory, not a repeated productivity workflow. |
| 8 | Aesthetic and minimalist design | 2 | The opening is distinctive and polished, but cards repeat identity content and expose too much quote/detail at once. |
| 9 | Error recovery | n/a | There is no meaningful destructive or error-prone task on this surface. |
| 10 | Help and documentation | n/a | The page is self-explanatory and includes its own constitution FAQ. |
| **Total** |  | **17/28** | **Acceptable — a strong visual foundation with significant directory and mobile problems.** |

## Design Specificity Verdict

The page feels authored for Woxsen Student Council, not interchangeable with a generic team directory. The editorial serif, red italic accent, real group portrait, president takeover, and role-based sections create a recognisable identity.

The most product-specific asset choice is also the largest design problem: many portraits are already finished posters containing council marks, names, and handwritten role titles. The interface then repeats those names, roles, and programme details below. Two independent visual systems compete inside every card.

The deterministic scan reported one `broken-image` warning in `member-portrait.tsx:10`. This is a false positive caused by the literal `<img>` text in a documentation comment; the component uses `next/image` and has an intentional monogram fallback.

Browser inspection was completed on the authenticated local Council page at 1440×1000 and 390×844 in dark and light themes. The live detector overlay could not be injected because the page Content Security Policy blocked `http://localhost:8400/detect.js`.

## Overall Impression

The first two sections look like a confident editorial feature. Once the member directory begins, it becomes a dense wall of poster imagery, long italic quotes, repeated identity text, and uneven data. The biggest opportunity is to turn the page from a showcase that happens to contain a directory into a showcase with a genuinely usable directory.

## What's Working

- The hero has a clear voice. Fraunces, the red italic line, and the restrained black canvas feel specific to the Council rather than like a template.
- The group portrait is excellent content and is presented at an appropriate scale without destructive cropping.
- The information model is thoughtful: semantic heading levels, one shared member dialog, reduced-motion handling, monogram fallbacks, and real contact links are solid foundations.

## Priority Issues

### [P1] Two-column mobile cards are too narrow for the content

At 390px, secretary and treasurer cards render side by side. Long roles, italic quotes, names, and programmes are forced into roughly 160px columns. Names break into three lines, programmes become five lines, and the reading order feels like a newspaper squeezed into a phone.

**Fix:** Use one card per row below `sm`, or replace the small-card tier with a compact horizontal directory row. Keep the index to portrait, name, and role; move quotes and programme detail into the dialog.

**Suggested command:** `$impeccable adapt`

### [P1] Portrait artwork and interface typography duplicate each other

The uploaded portraits already contain the council crest, Woxsen mark, member name, and scripted role. The card and dialog repeat the member name and role immediately below. This creates competing typefaces, repeated logos, and a visible “poster inside a card” effect.

**Fix:** Prefer clean portrait masters without embedded typography. If those assets are unavailable, introduce a deliberate poster-card mode that does not repeat the embedded content, rather than mixing poster artwork with directory metadata.

**Suggested command:** `$impeccable typeset`

### [P1] The directory is difficult to navigate at 64 members

There is no section index, jump navigation, search, or role filter. A student looking for a school representative or club president must scroll through a long sequence and remember where sections appeared. The club-president carousel also moves continuously, which makes targeted reading harder.

**Fix:** Add a compact sticky section index near the top (`Board`, `Core Team`, `School Reps`, `SCFC`, `Club Presidents`) and optionally a name/role search. Reduce index-card content so sections scan quickly.

**Suggested command:** `$impeccable layout`

### [P1] The auto-scroll duplicates interactive content for assistive technology

`CouncilHScroll` renders the complete member list twice to create a seamless loop. The second copy is not hidden from assistive technology and retains its buttons and links, so keyboard and screen-reader users encounter every club president twice. Desktop arrow buttons are also below the recommended 44px target.

**Fix:** Mark the duplicate set `aria-hidden`, remove its descendants from the tab order, enlarge arrow targets, and pause movement on keyboard focus as well as pointer interaction. A finite scroll-snap list would be simpler and more controllable.

**Suggested command:** `$impeccable audit`

### [P2] The display serif is carrying too many roles

The same expressive family handles the hero, president quote, member quotes, member names, section headings, and FAQ questions. Individual uses are attractive, but across 64 cards the repeated italics make every quote compete with the person's name. The 10rem hero also creates an unnecessarily extreme jump from navigation and body copy.

**Fix:** Reserve the display roman for major headings and names. Use the sans family for card quotes or remove quotes from the index. Cap the desktop hero near 6rem–7rem and preserve the larger theatrical treatment only where it creates a genuine page-level moment.

**Suggested command:** `$impeccable typeset`

## Persona Red Flags

**Jordan, first-time student:** Jordan wants to identify the right representative but sees 64 people with no section shortcuts or search. They must infer the organisation from headings encountered during a long scroll and may never reach the relevant group.

**Priya, mobile visitor:** Priya encounters two narrow cards per row with long italic quotes and heavily wrapped programme names. Poster text and UI text repeat the same identity, and fixed corner controls occasionally overlap imagery and card content.

**Alex, keyboard or screen-reader user:** Alex encounters duplicated focusable club-president cards because the looping track renders the list twice. The stretched card trigger relies on a subtle focus-within border, and auto-motion has no explicit status or persistent pause control.

## Minor Observations

- Programme and year formatting is inconsistent (`BBA(DSAI)`, `BBA - 1st year`, `2 nd year`, stray punctuation), which makes repeated cards look less disciplined.
- The president message contains copy errors such as “and leaves us” and inconsistent capitalization/hyphenation; editorial cleanup would improve the most prominent text on the page.
- The 10px labels over the group portrait are decorative rather than useful and have marginal readability on variable image backgrounds.
- The fixed theme/control buttons can overlap portraits and card controls on mobile.
- The constitution FAQ is useful but buried after the entire directory; a top-level jump link would make it discoverable.

## Questions to Consider

- Should this page primarily help students find the right person, or primarily celebrate the Council visually? The current page tries to give both goals equal weight.
- Are clean portrait files available, or must the embedded-name poster artwork remain the canonical asset?
- Do member quotes need to appear in the directory index, or can they become a reward inside the member detail panel?
