# FitRetro

FitRetro is a modern fitness platform focused on helping users achieve long-term health and
fitness goals through intelligent tracking, personalized guidance, and a clean user experience.

**V1** covers workout tracking, progress analytics, body measurements, nutrition and macro
tracking, LLM-assisted recipe creation, and gamified habit building. **V2** will add recovery
monitoring, AI-powered coaching, wearable integration, personalized recommendations, and
social/community features.

## Tech stack

Next.js (App Router) + TypeScript, Tailwind CSS, PostgreSQL via Drizzle ORM, Vitest.

## Getting started

```bash
cp .env.example .env   # set DATABASE_URL to a running Postgres instance
npm install
npm run db:migrate     # apply database migrations
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Start the dev server                     |
| `npm run build`       | Production build                         |
| `npm run lint`        | Run ESLint                               |
| `npm run format`      | Format the codebase with Prettier        |
| `npm run typecheck`   | Run `tsc --noEmit`                       |
| `npm run test`        | Run the test suite once                  |
| `npm run test:watch`  | Run tests in watch mode                  |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate`  | Apply pending migrations                 |
| `npm run db:studio`   | Browse the database with Drizzle Studio  |

## Project structure

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture overview, folder layout, and
conventions used across the codebase.
