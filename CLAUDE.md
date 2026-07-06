# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The Woxsen Student Council portal: a Next.js 15 (App Router, React 19) site with a
public marketing/site surface and a role-gated management panel. Content lives in a
Turso/libSQL database accessed through Drizzle ORM. Media is stored in Cloudflare R2.
Auth is Auth.js (next-auth v5 beta) with a Credentials provider. Payments use Razorpay.

## Commands

```bash
npm run dev            # dev server (Next.js, no-deprecation node flag)
npm run devsafe        # same but wipes .next first
npm run build          # production build
npm run start          # serve the production build
npm run lint           # next lint (eslint-config-next)

npm test               # vitest run (all *.test.ts under src/)
npm run test:watch     # vitest watch
npx vitest run src/lib/tickets.test.ts   # run a single test file

npm run db:generate            # drizzle-kit generate — SQL migration from schema.ts
npm run db:migrate             # apply migrations (tsx src/db/migrate.ts)
npm run db:studio              # drizzle-kit studio
npm run db:seed-admin          # seed an initial admin user (scripts/seed-admin.ts)
npm run db:migrate-from-payload  # one-time copy from legacy Payload tables
npm run sync:club-logos        # regenerate /public/club-logos from R2
```

Env lives in `.env.local` (loaded by `drizzle.config.ts` too). Key vars: `LIBSQL_URL`,
`LIBSQL_AUTH_TOKEN`, `R2_*` (endpoint/keys/public URL), Razorpay keys, `AUTH_SECRET`.

## Architecture

### Data layer — the `mp_*` dual-read strategy
This database previously belonged to a Payload CMS. Every Drizzle table is prefixed
`mp_` (`src/db/schema.ts`) so it coexists with Payload's original tables without
collision — Payload's tables are never touched, making rollback a `git revert`.
`drizzle.config.ts` enforces this with `tablesFilter: ["mp_*"]`.

- `src/db/client.ts` — singleton Drizzle client cached on `globalThis` (survives HMR).
  Deliberately **not** `server-only` so the `tsx` migration/seed scripts can import it.
- `src/db/schema.ts` — tables + `relations()`. Globals (`homepage_config`,
  `site_settings`) are single-row typed tables (id forced to 1), not key/value blobs.
  Array/nested fields are JSON columns, not child tables. Enums are text columns
  narrowed with `$type<>()` reusing the unions in `src/lib/schemas.ts`.

### Read path — `src/lib/content.ts`
The **only** seam between the DB and the UI. Every public getter (`getEvents`,
`getClubs`, `getCouncil`, `getHomepageConfig`, …) is wrapped in React `cache()` so
components in one request share a query. Return shapes match the old Payload API, so
the public site was untouched by the migration. Homepage/site-settings getters merge
DB rows over hardcoded defaults (`HOMEPAGE_DEFAULTS`, `SITE_SETTINGS_DEFAULTS`).

### Write path — server actions
Each management resource has a colocated `actions.ts` marked `"use server"` under
`src/app/management/(panel)/<resource>/`. Actions call RBAC guards, mutate via Drizzle,
then `revalidatePath()`. Publishing an event fans out through
`src/lib/automation/on-publish.ts` (announcement + recap stub + homepage feature +
cache bust + optional Discord webhook) — each step is best-effort and idempotent.

### Auth & RBAC
- `src/auth.config.ts` — edge-safe base config (no bcrypt/db), so `src/middleware.ts`
  can gate `/management/**` in the edge runtime via the `authorized` callback.
- `src/auth.ts` — full Node-runtime setup; Credentials provider verifies bcrypt against
  `mp_users`, with failed-attempt counting and a 10-min lockout after 8 failures.
- `src/lib/rbac.ts` — the authorization vocabulary. Roles: `super_admin`, `admin`,
  `council_member`, `club_lead`, `editor`, `viewer`. Use `requireUser`/`requireRole`/
  `requireOps` (throwing guards) in server actions and `canPublish`/`isAdmin` for
  branching. `assertCanEditEvent` scopes `club_lead` to their own club's events.
- The `(panel)/layout.tsx` calls `requireOps()` and redirects to the login page on
  failure; it also hides admin-only nav (`Users`, `Homepage`, `Settings`).

### Routing
- `src/app/(site)/` — public pages (home, events, clubs, council, support, archive,
  dashboard). `src/app/management/` — login + `(panel)` admin UI.
- `src/app/api/` — `register`, `media/upload` (R2), `payments/razorpay/{verify,webhook}`,
  and the `[...nextauth]` handler.

### Media
`src/lib/r2.ts` wraps the S3-compatible R2 client (server-only). Uploads go under a
`media/` prefix; public URL is `${R2_PUBLIC_URL}/media/<key>`. `next.config.ts` allows
R2 remote image hosts and sets long-cache headers for pre-rendered club-wall/logo assets.

### Config notes
- `next.config.ts` externalizes `@libsql/*`/`sharp`/`drizzle-*` from the server bundle
  and sets a hand-written CSP that allows Razorpay + Vercel Analytics. CSP still uses
  `'unsafe-inline'`/`'unsafe-eval'` (no nonce pipeline yet).
- Path alias `@/*` → `src/*` (tsconfig + vitest).
- Tests are colocated `*.test.ts` next to their subject (e.g. `src/lib/tickets.test.ts`).

## Conventions

- Content getters are the single read seam — add new public reads to `src/lib/content.ts`,
  not ad-hoc queries in components.
- Server actions own writes and must go through the `src/lib/rbac.ts` guards.
- Keep the `mp_` prefix on every new table and never write to non-`mp_` (Payload) tables.
- Do not add Claude/Anthropic attribution to commits or PRs (client repo).

## Secrets policy

This repo was bitten by a backdoor admin account obfuscated into source via
base64 + a byte-array XOR decoder (`src/lib/runtime-flags.ts`, commit 883b626,
since deleted). To prevent recurrence:

- **Never commit secrets to source.** Read everything from `process.env.*` and
  ship a `.env.local.example` with placeholders only. `.env.local` is gitignored.
- **No obfuscation.** XOR/base64/byte-array decoders in source are forbidden.
  `.gitleaks.toml` has an explicit `xor-base64-decoder` rule that blocks the
  pattern; do not weaken it. If a value truly must ship pre-baked (e.g. a public
  build manifest), put it in plaintext with a comment explaining why it's not
  a secret — never in a "decoder" file.
- **Pre-commit secret scan is enforced.** `.githooks/pre-commit` runs gitleaks
  v8.30 (auto-fetched into `.githooks/.bin/`, which is gitignored) against staged
  content. Enable once per clone: `git config core.hooksPath .githooks`.
  CI/local lint commands do not run it — the hook is the gate. To override on
  a confirmed false positive, commit with `--no-verify` and add an allowlist
  entry in `.gitleaks.toml`.
- **If a real secret lands in history:** rotate it immediately (rotation is the
  fix; history scrubbing is optional and rewrites every SHA), then audit
  everything that touched it.
