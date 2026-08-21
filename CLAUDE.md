@AGENTS.md

# FitRetro

A fitness platform for tracking workouts, nutrition, body measurements, and habits, with
LLM-assisted recipe creation and gamified habit building.

## Vision

- **V1 (current focus):** workout tracking, progress analytics, body measurements, nutrition
  and macro tracking, LLM-assisted recipe creation, gamified habit building.
- **V2 (future):** recovery monitoring, AI-powered coaching, wearable device integration,
  personalized recommendations, and social/community features.

Prioritize clean architecture, scalable code, reusable components, and a responsive,
accessible UI. Prefer modular designs and clear separation of concerns over premature
abstraction.

## Tech stack

- **Framework:** Next.js (App Router) + TypeScript, `src/` layout
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/) (not Prisma — Prisma's
  engine binaries are unreachable in some sandboxed environments; Drizzle is pure TS/JS with no
  native binary download)
- **Testing:** Vitest + React Testing Library
- **Formatting/linting:** Prettier + ESLint (`eslint-config-next`, `eslint-config-prettier`)

## Project structure

```
src/
  app/                 Next.js routes (App Router)
  components/ui/       Shared, reusable UI components
  db/
    client.ts          Drizzle client singleton (reads DATABASE_URL)
    schema/             One file per domain (users, workouts, measurements, nutrition,
                         recipes, habits), re-exported via schema/index.ts
  features/            One folder per product feature, each with its own data-access layer:
    auth/               Signup/login/logout, password hashing, session verification (DAL)
    workouts/           Workout sessions, exercises, sets
    progress/           Analytics/trends derived from workouts + measurements
    measurements/       Body measurements (weight, height, body fat, etc.)
    nutrition/          Food/meal logging, macro tracking, LLM-powered food suggestions
    recipes/            Recipe storage, including LLM-generated recipes
    habits/             Habit tracking with streaks and points (gamification)
    routines/            User-built daily routines (e.g. morning/evening) with ordered,
                         completable steps; each step has a static template note plus a
                         separate per-day completion note.
    peptides/            User-defined peptides (name, dose, frequency) with per-day dose logs;
                         no due-date/reminder logic — frequency is reference only
  lib/                 Cross-cutting utilities (e.g. session cookie signing)
    date.ts              Shared "YYYY-MM-DD" day-param parsing/formatting, used by every
                         day-scoped page/action (avoids each feature reinventing it)
    hooks/               Shared React hooks (e.g. speech-to-text) reused across features
  proxy.ts             Route protection (this Next.js version renames middleware.ts to
                       proxy.ts — see AGENTS.md and node_modules/next/dist/docs)
```

### Route structure: `/today` vs `/settings/*`

Day-to-day activity (meals, workouts logged, routine checklist) lives on one consolidated
**`/today`** page, driven by a `?date=` search param via the shared `DayNav` component
(`src/components/ui/day-nav.tsx`) — prev/next/date-picker, defaulting to today. Its
`_components/` are grouped by domain (`nutrition/`, `routine/`, `workouts/`).

Config that doesn't change day to day — nutrition goals, workout split schedule + exercise
templates, routine templates — lives under **`/settings/*`** instead (each with its own
`page.tsx` and `_components/`), one section per domain, linked from a `/settings` index.

Server actions stay in their originating feature's route folder (`src/app/nutrition/actions.ts`,
`src/app/routine/actions.ts`, `src/app/workouts/actions.ts`) even though those folders no longer
have a `page.tsx` of their own — both `/today` and the relevant `/settings/*` page import from
them, since a `"use server"` module isn't tied to any single route.

Each feature module owns its own queries/data-access functions and only touches the database
tables relevant to that feature. Route handlers and UI components should import from a
feature's barrel (`@/features/<name>`) rather than reaching into `src/db` directly.

## Common commands

```bash
npm run dev             # start the dev server
npm run build            # production build
npm run lint             # ESLint
npm run format            # Prettier write
npm run format:check      # Prettier check (CI)
npm run typecheck         # tsc --noEmit
npm run test              # Vitest (single run)
npm run test:watch        # Vitest (watch mode)
npm run db:generate        # generate a Drizzle migration from schema changes
npm run db:migrate         # apply pending migrations
npm run db:studio          # browse the database with Drizzle Studio
```

## Database

Copy `.env.example` to `.env` and set `DATABASE_URL` to a running Postgres instance before
running any `db:*` script or the app itself. Schema lives in `src/db/schema/*.ts`; run
`npm run db:generate` after changing it to produce a migration under `drizzle/`.

Migrations are per-slot files (`drizzle/000N_*.sql`) tracked by content hash in the DB's
migrations table — never delete/regenerate an already-generated migration file to reshape a
table again, even mid-feature. Once a migration file has existed, assume some database
somewhere may have already applied it; add a new migration instead. (This nearly bit the
daily-mission feature: three redesigns reused migration slot 14 with three different filenames
before it shipped, which would have left any database that had already migrated against an
earlier version with a stale table shape and a broken `/today` page.)

**Data safety:** never run a schema change, migration, or bulk mutation that can destroy or
overwrite existing rows (dropped/renamed columns, dropped tables, `DELETE`/`UPDATE` without a
narrow `WHERE`, `db:generate` output that Drizzle marks with a data-loss warning) without both
(a) telling the user explicitly what will be lost, and (b) taking a backup first — no exceptions,
regardless of environment or how minor the change seems. Claude sessions do not have direct
access to the production database or droplet; production changes only ever happen through
commands handed to the user to run themselves. So in practice: any command sequence handed to
the user that includes a migration or other destructive step must have a `pg_dump` backup step
prepended automatically, e.g. `pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d%H%M%S).sql &&
npm run db:migrate && ...`. For databases a session can reach directly (e.g. a sandboxed dev DB),
back it up the same way before running anything destructive there, no exceptions.

## Deploying

Production runs on the user's own droplet under pm2 as process name **`fitretro`**, checked out
at **`/opt/fitretro`** (that's also where `.env` lives). Claude sessions have no SSH/droplet
access — deploys only ever happen via a command handed to the user to run themselves. Standard
command (only include the `db:migrate`/backup steps when the diff being deployed actually has a
pending migration):

```bash
cd /opt/fitretro && \
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d%H%M%S).sql && \
git pull origin <branch> && npm install && npm run db:migrate && \
npm run build && pm2 restart fitretro
```

For a pure code change with no schema migration, drop the `pg_dump`/`db:migrate` steps.

## Auth

Email/password auth using stateless JWT sessions (`jose`) in an httpOnly cookie — see
`src/lib/session.ts` and `src/features/auth/`. `SESSION_SECRET` in `.env` signs the cookie.
Route protection is optimistic (`src/proxy.ts`, cookie-only check); the real authorization
boundary is `verifySession()` from `@/features/auth`, called in every protected page/action.

## LLM-assisted features

Food suggestions, macro estimation, and (future) LLM-generated recipes call the Claude API via
`@anthropic-ai/sdk`. Set `ANTHROPIC_API_KEY` in `.env` to enable them — everything else works
without it. Default to `claude-haiku-4-5` for simple, low-stakes generation tasks (text macro
estimation, suggestions) to keep cost negligible; reach for a larger model only when a task
needs deeper reasoning — e.g. `claude-sonnet-5` for photo-based macro estimation, since
identifying foods and portion sizes from an image is harder than parsing an exact text
description. Server Actions default to a 1MB body limit; `next.config.ts` raises it to `10mb`
to fit meal photos (capped at 8MB in the action itself).
