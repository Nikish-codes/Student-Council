# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The **Woxsen Student Council portal**: the official portal of the Woxsen Student
Council at Woxsen University. It has a public marketing/site surface (home,
events, clubs, council, sports, support, tickets) and a role-gated management
panel for the council team. Content lives in a Turso/libSQL database accessed
through Drizzle ORM. Media is stored in Cloudflare R2. Auth is Auth.js
(next-auth v5 beta) with a Credentials provider. Payments use Razorpay (India).
The site is deployed on Vercel.

The codebase was migrated from a Payload CMS. The database still contains
Payload's original tables (untouched), and every new Drizzle table is prefixed
`mp_` so both schemas coexist. Rollback is a `git revert`.

## Tech stack

- **Framework**: Next.js 15 (App Router, React 19, RSC), TypeScript 5
- **Database**: Turso (libSQL) via Drizzle ORM 0.45
- **Media**: Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3`
- **Auth**: Auth.js / next-auth v5 beta, Credentials provider, bcrypt, JWT sessions
- **Payments**: Razorpay (REST + HMAC-SHA256 verification, hosted checkout)
- **Motion**: GSAP 3 (ScrollTrigger, SplitText) + Framer Motion 12
- **Styling**: Tailwind CSS 3 + tailwindcss-animate, CSS-variable theming (dark/light)
- **UI primitives**: Radix UI (dialog, accordion, tabs, tooltip, scroll-area, …)
- **Forms**: react-hook-form + zod resolvers
- **QR/barcode**: `qrcode` (generation) + `@zxing/browser` (check-in scanning)
- **Fonts**: next/font (Fraunces display, Inter sans, JetBrains Mono) via CSS vars
- **Icons**: lucide-react
- **Toasts**: sonner
- **Testing**: vitest 4
- **Linting**: eslint-config-next
- **Formatting**: prettier + prettier-plugin-tailwindcss

## Commands

```bash
npm run dev                # dev server (Next.js, --no-deprecation flag)
npm run devsafe            # same but wipes .next first (use after next.config.ts changes)
npm run build              # production build
npm run start              # serve the production build
npm run lint               # next lint (eslint-config-next)

npm test                   # vitest run (all *.test.ts under src/)
npm run test:watch         # vitest watch
npx vitest run src/lib/tickets.test.ts   # run a single test file

npm run db:generate        # drizzle-kit generate — SQL migration from schema.ts
npm run db:migrate         # apply migrations (tsx src/db/migrate.ts)
npm run db:studio          # drizzle-kit studio (DB browser)
npm run db:seed-admin      # seed an initial admin user (scripts/seed-admin.ts)
npm run db:migrate-from-payload  # one-time copy from legacy Payload tables

npm run clubs:sync-taxonomy  # sync club categories from CSV
npm run clubs:import-content # import club detail-page content from CSV
npm run brand:optimize       # optimize brand assets (crest/logos)
npm run sync:club-logos      # regenerate /public/club-logos from R2
npm run sync:recap-videos    # sync recap video URLs
```

- `next.config.ts` changes require a full dev server restart — use `npm run devsafe`.
- Path alias `@/*` → `src/*` (tsconfig + vitest).
- Tests are colocated `*.test.ts` next to their subject (e.g. `src/lib/tickets.test.ts`).

## Environment variables

Env lives in `.env.local` (loaded by `drizzle.config.ts` too). Copy from
`.env.local.example` (placeholders only; `.env.local` is gitignored). Key vars:

| Var | Purpose |
|-----|---------|
| `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN` | Turso database connection |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL` | Cloudflare R2 media storage |
| `AUTH_SECRET` | JWT session signing secret (`openssl rand -base64 32`) |
| `TICKET_SECRET` | HMAC secret for ticket QR signing (falls back to `AUTH_SECRET`) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay payments |
| `NEXT_PUBLIC_SITE_URL` | Public base URL for absolute ticket links + QR payloads |
| `COMING_SOON` | `on` (default) gates the public site behind /coming-soon; `off` reveals it |
| `SITE_PREVIEW_KEY` | Optional shareable preview key (`?preview=<key>` unlocks for 30 days) |
| `NEXT_PUBLIC_LAUNCH_DATE` | Optional ISO date for the coming-soon countdown |
| `DISCORD_WEBHOOK_URL` | Optional: on-publish event notification |
| `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` | One-time admin seed (remove after) |
| `PAYLOAD_SECRET` | Legacy Payload CMS (still shares the DB) |

## Architecture

### Directory structure

```
portal/
├── src/
│   ├── app/                          # Next.js App Router (all routes)
│   │   ├── (site)/                   # Public site route group (has layout)
│   │   │   ├── layout.tsx            # Site chrome: header, footer, smooth-scroll, grain, dots
│   │   │   ├── page.tsx              # Homepage (ISR 60s)
│   │   │   ├── clubs/
│   │   │   │   ├── page.tsx          # /clubs explorer (category-grouped grid)
│   │   │   │   └── [slug]/page.tsx   # /clubs/[slug] detail (ISR 300s, generateStaticParams)
│   │   │   ├── council/page.tsx      # /council (president takeover + grouped cards)
│   │   │   ├── events/
│   │   │   │   ├── page.tsx          # /events (almanac + browser + past)
│   │   │   │   └── [slug]/page.tsx   # /events/[slug] detail (registration, recaps, related)
│   │   │   ├── sports/
│   │   │   │   ├── page.tsx          # /sports hub
│   │   │   │   ├── calendar/page.tsx # match calendar
│   │   │   │   ├── leagues/          # /sports/leagues + [slug]
│   │   │   │   └── tournaments/      # /sports/tournaments + [slug]
│   │   │   └── support/page.tsx     # /support (channels + grievance form + FAQs)
│   │   ├── management/               # Admin panel
│   │   │   ├── login/                # Login page + form + actions
│   │   │   │   ├── page.tsx
│   │   │   │   ├── login-form.tsx
│   │   │   │   └── actions.ts        # Parses structured auth errors (LOCKED/FAILED)
│   │   │   └── (panel)/              # Panel route group (gated by requireOps)
│   │   │       ├── layout.tsx         # Sidebar nav + content shell; hides admin nav
│   │   │       ├── sidebar-nav.tsx    # Client component: grouped nav, active state, mobile drawer
│   │   │       ├── page.tsx           # Dashboard overview
│   │   │       ├── sign-out-button.tsx
│   │   │       ├── events/            # Events CRUD (table, editor, [id], actions, registrations)
│   │   │       ├── recaps/            # Recap CRUD (table, [id], actions)
│   │   │       ├── announcements/     # Announcement CRUD (table, [id], actions)
│   │   │       ├── highlights/        # Highlights grid + reordering (actions, [id])
│   │   │       ├── clubs/             # Club CRUD + categories sub-resource
│   │   │       ├── council/           # Council member CRUD + groups sub-resource
│   │   │       ├── faqs/              # FAQ CRUD + reordering
│   │   │       ├── support/          # Support channel CRUD
│   │   │       ├── media/            # Media library (search, delete, alt-text, pagination)
│   │   │       ├── vault/             # Vault stories editor (custom editorial control)
│   │   │       ├── homepage/         # Homepage composer (hero, stats, manifesto, CTAs)
│   │   │       ├── users/            # User CRUD (admin only, unlock button)
│   │   │       ├── settings/         # Site settings (grievance categories, social, campus)
│   │   │       └── sports/            # Sports vertical management
│   │   │           ├── tournaments/  # Tournament CRUD (table, [id], actions)
│   │   │           ├── leagues/      # League CRUD (standings, table, [id], actions)
│   │   │           ├── matches/      # Match CRUD + live cockpit ([id]/match-cockpit)
│   │   │           ├── teams/        # Team CRUD (table, [id], actions)
│   │   │           ├── people/       # Sports people CRUD (alumni/representatives)
│   │   │           └── settings/     # Sports page config (gallery, academy logo, tagline)
│   │   ├── eventmanagement/          # Event-day ops cockpit (check-in)
│   │   │   ├── page.tsx              # Event list
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx          # Event console (stats, audit log, attendee table)
│   │   │   │   ├── console-tools.tsx # Manual add, cancel, stats
│   │   │   │   ├── attendee-table.tsx
│   │   │   │   └── checkin/          # QR scanner check-in
│   │   │   │       ├── page.tsx
│   │   │   │       ├── actions.ts
│   │   │   │       └── scanner.tsx   # @zxing/browser QR scanner
│   │   ├── coming-soon/              # Coming-soon teaser (gated by COMING_SOON env)
│   │   │   ├── page.tsx
│   │   │   └── teaser.tsx
│   │   ├── t/                        # Attendee ticket pages
│   │   │   ├── [code]/               # /t/[code] — ticket by QR code
│   │   │   │   ├── page.tsx
│   │   │   │   └── ticket-actions.tsx
│   │   │   └── lookup/               # /t/lookup — ticket recovery (super_admin only)
│   │   │       ├── page.tsx
│   │   │       ├── actions.ts
│   │   │       └── lookup-form.tsx
│   │   ├── api/                      # API routes
│   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js handler
│   │   │   ├── media/
│   │   │   │   ├── upload/route.ts   # R2 upload (sharp for dimensions, 25MB limit)
│   │   │   │   └── from-url/route.ts # Ingest external image URL → mp_media row
│   │   │   ├── payments/razorpay/
│   │   │   │   ├── verify/route.ts   # Payment verification callback
│   │   │   │   └── webhook/route.ts  # Razorpay webhook (HMAC verified)
│   │   │   ├── register/route.ts     # Event registration (free/paid)
│   │   │   └── tickets/ics/[code]/route.ts  # .ics calendar export for a ticket
│   │   ├── layout.tsx                # Root layout (fonts, boot overlay, theme pre-paint)
│   │   └── globals.css              # Design tokens, boot overlay, FOUC guard, components
│   ├── auth.ts                       # Full Auth.js (Node): Credentials + bcrypt + lockout
│   ├── auth.config.ts                # Edge-safe Auth.js config (no bcrypt/db) for middleware
│   ├── middleware.ts                 # Coming-soon gate + panel protection (edge)
│   ├── components/
│   │   ├── chrome/                   # Site chrome
│   │   │   ├── site-header.tsx       # Nav, theme toggle, announcements ticker
│   │   │   ├── site-footer.tsx       # Footer with grievance/support links
│   │   │   ├── smooth-scroll-provider.tsx  # Lenis smooth scroll
│   │   │   ├── dotted-background.tsx # Decorative dot grid
│   │   │   └── grain-overlay.tsx     # SVG noise grain
│   │   ├── management/               # Panel building blocks
│   │   │   ├── data-table.tsx        # Shared DataTable (search, sort, filter tabs, pagination)
│   │   │   ├── fields.tsx            # TextField, TextAreaField, SelectField, DateTimeField,
│   │   │   │                          #   ColorField, TagsField, MediaField, RepeaterField,
│   │   │   │                          #   MultiSelectField, SaveBar (toast on save)
│   │   │   ├── page-header.tsx       # Panel page heading
│   │   │   ├── delete-button.tsx     # Confirmation delete button
│   │   │   └── vault-editor.tsx      # Vault story editor (full editorial control)
│   │   ├── sections/                 # Public site sections (most are RSC)
│   │   │   ├── hero.tsx              # Homepage hero (GSAP SplitText, WebGL canvas)
│   │   │   ├── hero-live-badge.tsx
│   │   │   ├── impact-strip.tsx      # Count-up stats strip
│   │   │   ├── home-lazy-sections.tsx # Lazy-loaded below-the-fold homepage sections
│   │   │   ├── home-featured-event.tsx
│   │   │   ├── home-upcoming-strip.tsx
│   │   │   ├── home-reel.tsx
│   │   │   ├── home-vault.tsx        # Vault stories (video/image/text)
│   │   │   ├── campus-highlights.tsx # Highlights bento grid
│   │   │   ├── stats-symphony.tsx
│   │   │   ├── manifesto-kinetic.tsx
│   │   │   ├── quick-actions.tsx
│   │   │   ├── closing-cta.tsx
│   │   │   ├── clubs-explorer.tsx   # /clubs category-grouped grid
│   │   │   ├── clubs-logo-wall.tsx  # Marquee of all club logos
│   │   │   ├── club-card.tsx        # Individual club card (GSAP tilt, no blurb)
│   │   │   ├── club-section-header.tsx
│   │   │   ├── club-activities.tsx
│   │   │   ├── club-videos.tsx      # YouTube/Vimeo embeds with click-to-load facade
│   │   │   ├── council-showcase.tsx  # President takeover + grouped member grid
│   │   │   ├── council-card.tsx     # Member card (expandable dialog)
│   │   │   ├── council-member-dialog.tsx
│   │   │   ├── council-group-photo.tsx
│   │   │   ├── council-hscroll.tsx  # Horizontal-scroll group layout
│   │   │   ├── member-links.tsx     # Email/LinkedIn/social links
│   │   │   ├── member-portrait.tsx
│   │   │   ├── event-browser.tsx   # /events filterable browser
│   │   │   ├── events-almanac.tsx   # Timeline view
│   │   │   ├── events-overture.tsx
│   │   │   ├── events-rail.tsx
│   │   │   ├── events-graveyard.tsx # Past events
│   │   │   ├── events-recap.tsx    # Recap gallery + stats
│   │   │   ├── event-registration.tsx # Registration form (free/paid, Razorpay checkout)
│   │   │   ├── grievance-form.tsx  # /support grievance (Outlook deep-link, no email field)
│   │   │   ├── support-guide.tsx  # Support channels grid
│   │   │   ├── announcements-ticker.tsx
│   │   │   ├── sports-gallery.tsx # Sports page gallery marquee
│   │   │   └── spotlight-card.tsx
│   │   ├── motion/                  # Reusable motion primitives
│   │   │   ├── reveal.tsx           # Scroll-triggered fade/rise (GSAP)
│   │   │   ├── scroll-reveal.tsx
│   │   │   ├── parallax-image.tsx
│   │   │   ├── count-up.tsx         # Number count-up animation
│   │   │   ├── magnetic.tsx         # Cursor magnetic pull
│   │   │   ├── marquee.tsx          # Infinite marquee
│   │   │   └── scramble-text.tsx   # Scramble-decode text
│   │   ├── system/
│   │   │   ├── boot-overlay.tsx     # Pre-hydration black overlay + crest + progress bar
│   │   │   └── theme-toggle.tsx    # Dark/light toggle (pre-paint script, .light class)
│   │   ├── ui/                      # Low-level UI primitives
│   │   │   ├── button.tsx          # Button (cva variants: primary/outline/ghost)
│   │   │   ├── badge.tsx
│   │   │   ├── picture.tsx         # Image with fallback label (initials)
│   │   │   ├── section-heading.tsx
│   │   │   ├── brand-marks.tsx     # Instagram/LinkedIn SVG marks
│   │   │   ├── cutout-portrait.tsx
│   │   │   └── event-video.tsx     # Click-to-load YouTube/Vimeo/R2 video facade
│   │   └── webgl/
│   │       └── hero-canvas.tsx     # OGL WebGL hero background
│   ├── db/
│   │   ├── client.ts               # Singleton Drizzle client (globalThis cache, not server-only)
│   │   ├── schema.ts               # All tables + relations + inferred types
│   │   └── migrate.ts             # Migration runner (tsx)
│   └── lib/
│       ├── content.ts              # THE read seam — all public getters (React cache())
│       ├── schemas.ts              # Zod schemas + shared types (enums, JSON shapes)
│       ├── rbac.ts                 # Roles, guards (requireUser/requireRole/requireOps)
│       ├── roles.ts                # ROLE_LABELS for UI
│       ├── r2.ts                   # Cloudflare R2 client (upload, delete, makeKey)
│       ├── razorpay.ts            # Razorpay order creation + HMAC verification
│       ├── registrations.ts       # Full ticketing flow (register, confirm, check-in, manual)
│       ├── tickets.ts             # Ticket code generation (unambiguous alphabet)
│       ├── ticket-sign.ts         # QR HMAC signing + scan verification (anti-forgery)
│       ├── ticket-sign.test.ts
│       ├── tickets.test.ts
│       ├── utils.ts                # cn, formatDate, shortDate, numberWord, outlookCompose(Full)
│       ├── utils.test.ts
│       ├── video.ts               # YouTube/Vimeo URL parsing + poster frames
│       ├── video.test.ts
│       ├── event-status.ts        # getEventTiming / isEventPast (single source of truth)
│       ├── event-status.test.ts
│       ├── event-ops.ts           # Event ops detail (stats, registrations for cockpit)
│       ├── audit.ts              # Audit log writer (check-in, manual add, cancel)
│       ├── club-accent.ts        # Per-club accent color normalization + validation
│       ├── club-accent.test.ts
│       ├── club-logos.ts        # Club logo path helpers
│       ├── council.ts           # Co-lead pairing (role-string derived)
│       ├── council.test.ts
│       ├── recap-media.ts      # Recap media URL resolution
│       ├── revalidate-club.ts  # revalidatePath helpers for club pages
│       ├── slug.ts / slugify.ts # uniqueSlug, slugify (with tests)
│       ├── slugify.test.ts
│       ├── rate-limit.ts       # Rate limiting (with test)
│       ├── rate-limit.test.ts
│       ├── media-options.ts    # Media option list helper
│       ├── sports-options.ts   # Sports option helpers (teams, people)
│       ├── qr.ts              # QR code generation (qrcode)
│       ├── identicon.ts       # Fallback identicon generation
│       ├── ics.ts             # .ics calendar file generation
│       ├── site-url.ts        # Site URL helper
│       ├── gsap.ts            # GSAP client setup (registerPlugin, defaults, useGSAP)
│       ├── automation/
│       │   └── on-publish.ts   # Publish fan-out (announcement, recap, homepage, revalidate, Discord)
│       └── vault-defaults.ts  # VAULT_FALLBACK_STORIES for editor pre-population
├── drizzle/                        # Generated SQL migrations + meta snapshots
├── scripts/                        # One-off tsx scripts (see Scripts below)
├── public/                         # Static assets (brand, club-wall, club-logos, recap, icons)
├── drizzle.config.ts               # Drizzle-kit config (tablesFilter: mp_*)
├── next.config.ts                  # CSP, webpack externals, R2/Cloudinary images, cache headers
├── tailwind.config.ts             # CSS-var color tokens, fonts, animations
├── vitest.config.ts               # Vitest (server-only stub, @ alias)
├── tsconfig.json                  # strict, @/* → src/*
├── .gitleaks.toml                 # Secret scanner config (xor-base64-decoder rule)
├── .githooks/pre-commit           # Gitleaks v8.30 on staged content
└── .env.local.example            # Env template (placeholders only)
```

### Data layer — the `mp_*` dual-read strategy

This database previously belonged to a Payload CMS. Every Drizzle table is
prefixed `mp_` (`src/db/schema.ts`) so it coexists with Payload's original
tables without collision — Payload's tables are never touched, making rollback
a `git revert`. `drizzle.config.ts` enforces this with `tablesFilter: ["mp_*"]`.

**`src/db/client.ts`** — singleton Drizzle client cached on `globalThis`
(survives HMR). Deliberately **not** `server-only` so the `tsx` migration/seed
scripts can import it. Falls back to `file:./payload.db` for local dev if
`LIBSQL_URL` is unset.

**`src/db/schema.ts`** — all tables + `relations()`. Key design decisions:
- Integer autoincrement PKs mirror Payload's IDs (preserves FK integers from the
  one-time data copy). New (registration/attendee) tables use text UUID PKs.
- Globals (`homepage_config`, `site_settings`, `sports_page_config`) are
  single-row typed tables (id forced to 1), not key/value blobs.
- Array/nested fields are JSON columns (`text { mode: "json" }`), not child
  tables — we own the reader/writer and the public site consumes plain JS arrays.
- Enums are text columns narrowed with `$type<>()`, reusing the unions in
  `src/lib/schemas.ts`.

**Tables** (all prefixed `mp_`):
- `mp_users` — auth (name, email, bcrypt password, role, clubId, phone, lockout fields)
- `mp_media` — media library (alt, url, filename, mimeType, dimensions, credit, tags)
- `mp_club_categories` — /clubs headings (slug, label, blurb, sortOrder)
- `mp_clubs` — clubs (card fields + detail-page content: about, cover, activities, videos, gallery, socials)
- `mp_events` — events (status, category, dates, venue, banner, registration, capacity, pricing)
- `mp_recaps` — post-event recaps (hero media, gallery, stats, linked event)
- `mp_announcements` — ticker items (pinned, dedupe by eventId)
- `mp_highlights` — bento grid (image, alt, caption, span, sortOrder)
- `mp_faqs` — FAQs (question, answer, page scope, sortOrder)
- `mp_council_groups` — /council sections (self-referencing parent for sub-groups)
- `mp_council_members` — council directory (memberType, groupId, clubId, isPresident)
- `mp_support_channels` — /support channels (icon, ownedBy, bring, councilRole)
- `mp_homepage_config` — single-row homepage config (hero, stats, manifesto, CTAs, vault)
- `mp_site_settings` — single-row site settings (grievance categories, social, campus)
- `mp_event_registrations` — registrations (UUID PK, Razorpay fields, status)
- `mp_attendees` — tickets (UUID PK, ticketCode unique, check-in fields, gate)
- `mp_notifications` — delivery outbox (best-effort ticket sends, retried)
- `mp_audit_log` — ops accountability (check-in, manual add, cancel, refund)
- `mp_sports_tournaments` — sports tournaments (status, sport, year, division, banner)
- `mp_sports_leagues` — sports leagues (standings JSON, like tournaments)
- `mp_sports_teams` — teams (logo, optional club link)
- `mp_sports_matches` — matches (tournament/league link, teams, live score, events JSON, postMatch)
- `mp_sports_people` — alumni/representatives (photo, role, graduation year, sport)
- `mp_sports_page_config` — single-row /sports config (academy logo, tagline, gallery)

**Relations** — defined with `relations()`. Circular FKs (users↔clubs,
councilGroups self-ref) use plain integer columns + `relations()` to avoid
SQLite circular-FK creation-order issues.

### Read path — `src/lib/content.ts`

The **only** seam between the DB and the UI. Every public getter is wrapped in
React `cache()` so components in one request share a query. Return shapes match
the old Payload API, so the public site was untouched by the migration.
Homepage/site-settings getters merge DB rows over hardcoded defaults
(`HOMEPAGE_DEFAULTS`, `SITE_SETTINGS_DEFAULTS`).

Key getters:
- `getEvents`, `getEvent(slug)`, `getUpcomingEvents`, `getPastEvents`, `getRelatedEvents`
- `getClubs`, `getClub(slug)` (full detail), `getClubEvents(clubId)`, `getClubLeads(clubId)`
- `getClubCategories`
- `getCouncil`, `getCouncilSections` (grouped + co-leads attached), `getPresident`, `getCouncilGroupPhoto`
- `getAnnouncements`, `getHighlights`, `getFaqs(page?)`, `getSupportChannels`
- `getHomepageConfig` (resolves flagship event + featured clubs + vault stories)
- `getSiteSettings` (grievance categories, social, campus)
- `getTicketByCode`, `getTicketsByContact` (ticket recovery)
- Sports: `getSportsTournaments/Leagues/Teams/Matches/People/PageConfig`

`currentSessionCopy()` rewrites stale year strings (2025/26 → 2026/27).

### Write path — server actions

Each management resource has a colocated `actions.ts` marked `"use server"`
under `src/app/management/(panel)/<resource>/`. Actions call RBAC guards, mutate
via Drizzle, then `revalidatePath()`. **Publishing an event** fans out through
`src/lib/automation/on-publish.ts` (announcement + recap stub + homepage feature
+ cache bust + optional Discord webhook) — each step is best-effort and
idempotent (dedupe by eventId).

Reordering actions exist for highlights, FAQs, and council members
(`moveHighlight`, `moveFaq`, `moveCouncilMember`).

### Auth & RBAC

- **`src/auth.config.ts`** — edge-safe base config (no bcrypt/db), so
  `src/middleware.ts` can gate `/management/**` in the edge runtime via the
  `authorized` callback. JWT strategy; callbacks stamp `uid`, `role`, `clubId`
  onto the token and into the session.
- **`src/auth.ts`** — full Node-runtime setup; Credentials provider verifies
  bcrypt against `mp_users`. Failed-attempt counting: 8 failures → 10-minute
  lockout. Throws structured errors `LOCKED:mins` / `FAILED:remaining` for the
  login form to parse.
- **`src/lib/rbac.ts`** — the authorization vocabulary.
  - Roles: `super_admin`, `admin`, `council_member`, `club_lead`, `editor`, `viewer`.
  - `requireUser` (throwing), `requireRole(...)`, `requireOps()` (any ops role).
  - `canPublish` / `isAdmin` for branching.
  - `assertCanEditEvent` scopes `club_lead` to their own club's events.
  - `assertCanEditClub` scopes `club_lead` to their own club's page.
- **`(panel)/layout.tsx`** calls `requireOps()` and redirects to login on
  failure; hides admin-only nav (`Users`, `Homepage`, `Settings`, `Vault`) for
  non-admins. `/t/lookup` is gated to `super_admin` on both page and action.

### Middleware — `src/middleware.ts`

Two jobs (edge runtime):
1. **Panel protection**: `/management/**` and `/eventmanagement/**` require a
   session; redirect to `/management/login` otherwise.
2. **Coming-soon gate** (`COMING_SOON` env, on by default): anonymous visitors
   see only `/coming-soon`. Logged-in team (any role) sees the real site. A
   `?preview=<SITE_PREVIEW_KEY>` URL drops a 30-day unlock cookie for
   stakeholders without accounts. Set `COMING_SOON=off` to reveal the site.

### Media

**`src/lib/r2.ts`** wraps the S3-compatible R2 client (server-only). Uploads go
under a `media/` prefix; public URL is `${R2_PUBLIC_URL}/media/<key>`.
- `uploadToR2(key, body, contentType)` → returns public URL.
- `deleteFromR2(key)` — used by media library delete.
- `makeKey(filename)` — lowercased, hyphenated, UUID-prefixed safe key.
- `publicUrl(key)` — builds the full R2 URL.

**`/api/media/upload`** — server-proxied upload: receives a file, stores in R2,
derives image dimensions with sharp, inserts an `mp_media` row. 25MB limit;
images/video/PDF only. Returns the new media record.

**`/api/media/from-url`** — ingests an external image URL (e.g. Cloudinary) into
an `mp_media` row without re-hosting (stores the URL as-is).

`next.config.ts` allows R2 + Cloudinary + YouTube poster remote image hosts and
sets long-cache headers for pre-rendered club-wall/logo assets.

### Ticketing & payments

**Ticket codes** (`src/lib/tickets.ts`): `WSC-XXXX-XXXX` format using an
unambiguous alphabet (no 0/O/1/I). `generateTicketCode()` + `newId()` (UUID).

**QR signing** (`src/lib/ticket-sign.ts`): HMAC-SHA256(ticketCode, secret)
truncated to 16 base64url chars. The QR carries `{SITE_URL}/t/{code}?k={sig}`.
`verifyScan()` rejects forged/altered signed tokens before any DB hit; typed
codes (no signature) are accepted — the DB lookup still gates them.

**Registration flow** (`src/lib/registrations.ts`):
- `registerForEvent` — free events confirm immediately + issue ticket; paid
  events create a Razorpay order + pending registration. De-dupes by
  (event, email). Capacity enforced inside a transaction with re-check.
- `confirmPaidRegistration` — verifies the signed order id matches the
  registration's order (anti-replay), race-safe capacity re-check, issues ticket.
- `confirmByOrderId` — webhook path (idempotent).
- `manualRegister` — staff walk-in / desk registration.
- `checkInAttendee` — atomic conditional update (`WHERE checkedInAt IS NULL`)
  so first-scan-wins; audit-logged; rejects wrong-event/cancelled tickets.

**Razorpay** (`src/lib/razorpay.ts`): dependency-free. Order creation via REST;
signature verification via HMAC-SHA256 with timing-safe comparison. Card data
never touches our server (hosted checkout). `paymentsConfigured()` /
`webhookConfigured()` check env.

**Routes**:
- `/api/register` — public registration (free/paid).
- `/api/payments/razorpay/verify` — payment verification callback.
- `/api/payments/razorpay/webhook` — HMAC-verified webhook.
- `/api/tickets/ics/[code]` — `.ics` calendar export.
- `/t/[code]` — attendee ticket page.
- `/t/lookup` — ticket recovery by email/phone (super_admin only).
- `/eventmanagement/[id]/checkin` — QR scanner check-in (@zxing/browser).

### Sports vertical

A full sports management + display surface:
- **Management** (`/management/sports/*`): tournaments, leagues (with JSON
  standings), teams, matches (with live scoring + event feed + post-match
  content), people (alumni/representatives), and page config (academy logo,
  tagline, gallery). The match cockpit (`[id]/match-cockpit.tsx`) drives live
  scoring with a timestamped event feed.
- **Public** (`/sports/*`): hub page, match calendar, league/tournament detail
  with standings and match lists.
- Enums in `src/lib/schemas.ts`: `SportType` (15 sports), `SportDivision`,
  `SportCompetitionStatus`, `SportMatchStatus`, `SportPersonRole`. Labels in
  `SPORT_LABELS` / `SPORT_DIVISION_LABELS`.

### Frontend & design system

**Theming** (`src/app/globals.css`): CSS-variable tokens (dark default, light
via `.light` class set by a pre-paint script + `ThemeToggle`). Colors: `bg`,
`surface`, `surface-2`, `ink`, `muted`, `subtle`, `line`, `accent` (Woxsen red
#ee495c), `accent-ink`. Fonts via `var(--font-sans/display/mono)`. Base font
size 17.5px (global ~9% scale-up). Fine paper grain overlay (SVG turbulence).

**Boot overlay** (`src/components/system/boot-overlay.tsx`): pre-hydration
black overlay with crest + progress bar, fades out after hydration. Defined
outside `@layer` in CSS so it paints first. The crest is an alpha-masked
`currentColor` shape (one 22KB request, theme-recouloured instantly) — replaced
two 134KB+126KB `<img>` downloads.

**FOUC guard** (`globals.css`): anything GSAP animates (`[data-headline]`,
`[data-club-card]`, etc.) is `opacity: 0` from first paint; GSAP flips it
visible on hydration. A `prefers-reduced-motion` media query reveals everything
and neutralizes animation durations.

**Motion**: GSAP (ScrollTrigger, SplitText) via `src/lib/gsap.ts` (client
setup, project defaults `power3.out` / 0.8s). Framer Motion for declarative
transitions. Reusable primitives in `src/components/motion/` (Reveal, CountUp,
Magnetic, Marquee, ParallaxImage, ScrambleText). Motion is hover-only on cards
and skipped on touch / reduced-motion devices.

**CSP** (`next.config.ts`): hand-written, allows Razorpay checkout + Vercel
Analytics + R2/Cloudinary images + YouTube/Vimeo frames. Still uses
`'unsafe-inline'`/`'unsafe-eval'` (no nonce pipeline yet).

**ISR**: public pages use `revalidate = 60` (homepage, time-sensitive) or
`300` (club detail, events). Event management pages are `force-dynamic`.

**Panel UI**:
- **`DataTable`** (`src/components/management/data-table.tsx`): client-side
  search, column sort, filter tabs with counts, pagination (25/page). Shared
  across events, recaps, announcements, clubs, council, FAQs, support, users,
  and all sports list pages via `*-table.tsx` wrappers.
- **Fields** (`src/components/management/fields.tsx`): TextField,
  TextAreaField, NumberField, SelectField, DateTimeField (local-time
  conversion to avoid UTC shift), CheckboxField, ColorField (hex + swatch),
  TagsField, MediaField (upload + pick-from-library + paste URL + ingest),
  RepeaterField (stacked mode for wide rows), MultiSelectField, SaveBar
  (toast on save via sonner).
- **Sidebar nav** (`sidebar-nav.tsx`): 240px fixed, grouped (Overview, Content,
  Organisation, Sports, Media + admin-only Homepage, Admin), active-state via
  `usePathname()`, mobile hamburger drawer. Icons passed as string names
  (mapped to LucideIcon) to avoid server→client serialization errors.

### Council co-lead pairing (`src/lib/council.ts`)

Co-leads are paired to their lead by **role string** (e.g. "Sports Co Lead" →
"Sports Lead"), not a foreign key. `attachCoLeads()` builds the map;
`unpairedCoLeads()` flags orphans for the panel. Trade-off: renaming a lead
role silently orphans its co-leads.

### Grievance form (`src/components/sections/grievance-form.tsx`)

No anonymous option, no student email field. Routes by category to Outlook via
`outlookComposeFull({to, cc, subject, body})` in `src/lib/utils.ts` (uses
`encodeURIComponent` + manual `&` joining; normalizes multiple recipients to
semicolons). Opens in a new tab via `window.open`. Categories with per-category
`to`/`cc` configured in Settings. react-hook-form + zod validation.

### Event categories

`tech`, `cultural`, `sports`, `flagship`, `academic`, `community` (blood
donation, green initiatives, social impact). Defined in `src/lib/schemas.ts`
(`eventCategorySchema`); accents in `events-almanac.tsx` / `event-browser.tsx`.

## Scripts (`scripts/`, run via `tsx`)

- `seed-admin.ts` — seed an initial super_admin from env (remove after).
- `migrate-from-payload.ts` — one-time copy from Payload tables to `mp_*`.
- `sync-club-taxonomy.ts` — sync club categories from CSV.
- `import-club-content.ts` — import club detail-page content from CSV.
- `optimize-brand-assets.ts` — optimize brand crest/logos.
- `sync-club-logos.ts` — regenerate `/public/club-logos` from R2.
- `sync-recap-videos.ts` — sync recap video URLs.
- `import-council-csv.ts` — import council members from CSV.

## Conventions

- **Content getters are the single read seam** — add new public reads to
  `src/lib/content.ts`, not ad-hoc queries in components.
- **Server actions own writes** and must go through the `src/lib/rbac.ts` guards.
- **Keep the `mp_` prefix** on every new table and never write to non-`mp_`
  (Payload) tables.
- **No comments in generated code** unless explicitly asked.
- **Do not add Claude/Anthropic attribution** to commits or PRs (client repo).
- Tests are colocated `*.test.ts` next to their subject.

## Secrets policy

This repo was bitten by a backdoor admin account obfuscated into source via
base64 + a byte-array XOR decoder (`src/lib/runtime-flags.ts`, commit 883b626,
since deleted). To prevent recurrence:

- **Never commit secrets to source.** Read everything from `process.env.*` and
  ship a `.env.local.example` with placeholders only. `.env.local` is gitignored.
- **No obfuscation.** XOR/base64/byte-array decoders in source are forbidden.
  `.gitleaks.toml` has an explicit `xor-base64-decoder` rule that blocks the
  pattern; do not weaken it. If a value truly must ship pre-baked (e.g. a public
  build manifest), put it in plaintext with a comment explaining why it's not a
  secret — never in a "decoder" file.
- **Pre-commit secret scan is enforced.** `.githooks/pre-commit` runs gitleaks
  v8.30 (auto-fetched into `.githooks/.bin/`, which is gitignored) against staged
  content. Enable once per clone: `git config core.hooksPath .githooks`. CI/local
  lint commands do not run it — the hook is the gate. To override on a confirmed
  false positive, commit with `--no-verify` and add an allowlist entry in
  `.gitleaks.toml`.
- **If a real secret lands in history:** rotate it immediately (rotation is the
  fix; history scrubbing is optional and rewrites every SHA), then audit
  everything that touched it.
