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
  lib/                 Cross-cutting utilities (e.g. session cookie signing)
  proxy.ts             Route protection (this Next.js version renames middleware.ts to
                       proxy.ts — see AGENTS.md and node_modules/next/dist/docs)
```

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
