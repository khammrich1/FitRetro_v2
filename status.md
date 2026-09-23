# FitRetro — Live Status

_Last updated: 2026-09-23 (#24 and #25 merged; #26 open, had a migration-slot conflict, now fixed)_

This file tracks in-progress work across sessions so context isn't lost between compactions/restarts. Update it whenever a task's state changes — don't let it go stale.

## Safety rules (standing, from CLAUDE.md)

- Never run a migration or destructive DB command without a `pg_dump` backup immediately before it, no exceptions, regardless of environment.
- Migrations are per-slot files under `drizzle/` — once a migration file has existed, never delete/regenerate it to reshape a table again. Add a new migration instead.
- Deploys to production (`/opt/fitretro`) only ever happen via a command handed to the user to run themselves — no direct droplet access from here.

## Active task: Stripe billing framework + mobile formatting fixes

User's instruction: "Finish up stripe and also there's some weird formatting issues on the web for mobile."

### 1. Stripe billing framework — **done, merged**

Scope (explicitly confirmed with user): **framework only, no paywall yet.** Nothing in the app
gates access on subscription status. One shared promo code (`FREEMONTH`, 100% off first month)
for the QR sticker, applied at Stripe Checkout.

Done:

- [x] `npm install stripe` (`^22.6.2`)
- [x] Stripe env vars documented in `.env.example`
- [x] `users.stripe_customer_id` column added
- [x] `subscriptions` table + `subscription_status` enum added (mirrors Stripe's own status values)
- [x] `src/lib/stripe.ts` — lazy Stripe client singleton
- [x] `src/features/billing/*` — queries, `getOrCreateStripeCustomer`, barrel
- [x] `src/app/billing/actions.ts` — `createCheckoutSessionAction`, `createBillingPortalSessionAction`
- [x] `src/app/api/stripe/webhook/route.ts` — webhook handler (first Route Handler in the codebase), writes `subscriptions` table only from verified Stripe events
- [x] `src/app/subscribe/page.tsx` — public-ish subscribe page, accepts `?promo=` from the QR sticker
- [x] `src/app/settings/billing/page.tsx` — billing status + manage-billing portal link
- [x] `src/proxy.ts` — `/subscribe` added to protected routes
- [x] `src/app/settings/page.tsx` — Billing entry added to settings index
- [x] Migration generated: `drizzle/0027_talented_xorn.sql` — purely additive (new table + nullable column), no data-loss warning
- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean
- [x] `npm run test` — 33/33 passing
- [x] `npm run format` / `format:check` — clean
- [x] Sandbox DB backed up (`pg_dump`) then migration applied (`npm run db:migrate`) — succeeded
- [x] Live smoke test (dev server + minted session cookie): `/settings/billing` → "No subscription yet"; `/subscribe` → plan UI, and `?promo=FREEMONTH` shows the applied-code banner + "Redeem free month" button; `/subscribe` with no cookie → 307 redirect to `/login`; `/settings` index lists "Billing". Test user cleaned up afterward.
- [x] Committed + pushed to `claude/stripe-billing-framework`
- [x] PR #24 opened into `main`, reviewed, and merged by the user

Not testable live in this sandbox: real Stripe checkout/webhook round-trip (no real `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` configured here) — noted in the PR body.

Not done (intentionally out of scope for this pass): no paywall/gating anywhere, no UI to enter a promo code manually on `/subscribe` beyond the `?promo=` query param + Stripe Checkout's own manual-entry field, no admin view of all subscribers.

**Note:** this work was originally built in a prior container session but never committed before that container was reclaimed (idle timeout) — it had to be rebuilt from scratch in this fresh container. Lesson: commit/push working state more eagerly instead of batching everything to the end of a long task.

### 2. Mobile formatting issues — **done, merged**

User sent two screenshots (Calendar, and the Quick Log area of `/today`). Root-caused both to
real overflow bugs (not just "narrow viewport" guesses — reproduced with Playwright before/after):

- **Calendar**: the per-tab score row (added in #23) was a single-line flex row with no wrap
  inside a ~30px-wide `grid-cols-7` day cell. Real multi-digit scores overflowed the cell and
  visually bled into the neighboring day — that's the garbled/overlapping numbers in the
  screenshot. Fixed: row now wraps within the cell, cell has `overflow-hidden` as a backstop.
- **Workout log form (Move tab) + in-progress workout card**: exercise-name input + muscle-group
  `<select>` + action button(s) in a plain `flex gap-2` row, no wrap. A `<select>` won't shrink
  below its content width, so on a narrow phone the trailing button got pushed off the right
  edge of the screen entirely — once that happens the whole page becomes horizontally
  scrollable, which is why unrelated text elsewhere on `/today` also looked cut off in the second
  screenshot (viewport was scrolled). Fixed: these rows now wrap instead of overflowing.

Done:

- [x] Reproduced both bugs with Playwright (seeded realistic data, multi-digit scores) at
      375–390px viewports, confirmed via `document.documentElement.scrollWidth` and screenshots
- [x] Fixed `src/app/calendar/page.tsx`, `src/app/today/_components/workouts/workout-log-form.tsx`,
      `src/app/today/_components/workouts/in-progress-workout-card.tsx`
- [x] Re-verified fix with Playwright — no overflow anywhere on `/today` (all 3 tabs), `/calendar`,
      `/pantry`, `/meal-prep` at 375px
- [x] `npm run typecheck` / `lint` / `test` (33/33) / `format:check` — all clean
- [x] Committed + pushed to `claude/fix-mobile-overflow` (branched fresh off `main`, kept separate
      from the Stripe branch since they're unrelated changes)
- [x] PR #25 opened into `main`, reviewed, and merged by the user

## Task: Peptide reconstitution calculator + "level in body" estimate

User's instruction: build a reconstitution calculator, plus a "level in your body" estimate
(clarified: pharmacokinetic decay, not vial-inventory-remaining — I'd guessed wrong initially).
Scoped it, gave a lift estimate, user said build the MVP (number, no chart) now, chart later.

### Status — **done, PR open**

- **Reconstitution**: optional vial amount (mg) + bac water (mL) on a peptide template →
  `src/features/peptides/reconstitution.ts` computes draw volume in mL + U-100 syringe units.
  Shown live while editing in Settings, on the template's display line, and next to the
  dose-log button on Today ("draw 0.10mL/10u").
- **Level in body (MVP, no chart)**: optional user-entered half-life (hours) →
  `src/features/peptides/decay.ts` sums `amount × 0.5^(hours since dose ÷ half-life)` across
  recent logged doses, shown as "~X% of a dose still active" on Today, captioned as a rough
  estimate / not medical guidance. The app never asserts a peptide's real half-life itself —
  only computes from whatever the user enters — and the feature just doesn't show when no
  half-life is set.
- New `peptide_logs.logged_at` timestamp (alongside the existing `logged_on` day) — needed
  because day-granularity is too coarse for a sub-day half-life. Existing day-bucketing
  elsewhere is untouched.
- Chart/visual-curve version explicitly deferred — flagged to user as a bigger follow-up (new
  charting dependency, first chart in the whole app) once the half-life-input approach feels right.

Done:

- [x] Migration originally `drizzle/0027_lowly_scarecrow.sql` — 3 nullable columns on
      `peptide_templates`, 1 `NOT NULL DEFAULT now()` column on `peptide_logs` (safe backfill,
      no data loss)
- [x] `src/features/peptides/reconstitution.ts` + `decay.ts`, both unit-tested (11 new tests)
- [x] `npm run typecheck` / `lint` / `test` (44/44) / `format:check` — all clean
- [x] Sandbox DB backed up before migration
- [x] Live smoke test: seeded a peptide (10mg/2mL/1hr half-life) + a dose logged 1 half-life ago,
      confirmed ~49% level (≈ expected 50%), correct draw volume in both Settings and Today,
      ~0% level after clearing logs
- [x] Caught and fixed a real bug mid-build: two client components imported the reconstitution
      helpers from the feature barrel (`@/features/peptides`), which also re-exports the
      server-only DB query module — pulled `postgres`'s Node-only `tls` dep into the client
      bundle and 500'd `/today`. Fixed by importing from `@/features/peptides/reconstitution`
      directly in the three client components that need it.
- [x] Committed + pushed to `claude/peptide-reconstitution-and-level` (branched fresh off `main`)
- [x] PR #26 opened into `main`
- [x] **Merge conflict found (migration slot collision):** #24 and #25 merged into `main` after
      this branch was opened; #24 (Stripe) independently claimed migration slot `0027`, same as
      this branch. Fixed by merging `main` into the branch and regenerating the peptide migration
      at the next free slot — now `drizzle/0028_lush_the_fallen.sql`, same content, correctly
      based. Verified by dropping and recreating the sandbox DB and running `db:migrate` from
      scratch through all 29 migrations (0000–0028); both Stripe's and the peptides' columns
      present afterward. Re-ran the full check suite post-merge — still clean. Pushed, PR body
      updated to explain the conflict/fix.
- [ ] Still open for user review — not yet merged.

## Task: Landing page feature clips

User asked for short clips of macro estimation + recipe-from-pantry/remaining-macros for the
landing page. **User is recording these themselves — no action needed from me.**

## Task: Stripe test-mode hardening — **done, PR #27 open**

Credential rules from the user: read only `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` from env. Never hardcode, print, log or commit a
credential, and never ask for keys to be pasted into chat. Secret key and webhook secret stay
server-only.

- All secret reads go through server-only `src/lib/stripe.ts`. Live keys are refused
  (`src/lib/stripe-mode.ts`). The webhook logs only the error message on signature failure.
- `.env.example` has exactly the four names, empty values. Removed the unused `STRIPE_PROMO_CODE`.
- The publishable key isn't read by any code yet (hosted Checkout doesn't need it).
- Verified: canary build shows no secrets in the client bundle. A local fake signing secret
  exercised real signature verification (valid → 200 + row written, tampered/missing/wrong
  secret → 400). A live key and a missing webhook secret each → 500, with no values in logs.
- **Still open:** real Checkout → webhook round trip. Needs the user's real test keys in `.env`
  on their side plus `stripe listen`. No Stripe values exist in this environment.

### Open, unresolved (not actioned)

- Apple App Store distribution was raised as an exploratory question. Flagged tension: Apple
  generally requires In-App Purchase (not Stripe) for subscriptions sold inside an App-Store-
  distributed app. User has not made a decision here — no action pending.
