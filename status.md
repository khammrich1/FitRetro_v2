# FitRetro — Live Status

_Last updated: 2026-10-04 (production-readiness review received; hardening PRs 1–2 of 6 open; owner checklist below is current)_

This file tracks in-progress work across sessions so context isn't lost between compactions/restarts. Update it whenever a task's state changes — don't let it go stale.

## What the owner needs to do (as of 2026-10-02)

Everything built so far is merged into `main`. None of it is live until the deploy in step 1 runs.
Steps 2–4 can happen before or after the deploy; the app works without them, and the pages that
need them say so until they're set.

### 1. Deploy (required — nothing from #31–#35 is live yet)

Six migrations are pending (0029–0034). They only add tables and columns; nothing existing is
dropped or rewritten. The backup line stays in regardless.

```bash
cd /opt/fitretro && git branch --show-current
```

If that prints anything other than `main`, stop and say so (the droplet should track `main`). Then:

```bash
cd /opt/fitretro && \
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d%H%M%S).sql && \
git pull origin main && npm install && npm run db:migrate && \
npm run build && pm2 restart fitretro
```

What this turns on immediately: double-subscribe guard, sticker signup attribution + `/ops`
funnel, meal-prep per-ingredient estimates, and Goals & milestones. Password reset and progress
pics also deploy, but stay inactive until steps 2 and 3.

### 2. Password reset email — Resend (required before anyone needs "Forgot password")

1. Create a Resend account and verify the domain you send from.
2. Add to `/opt/fitretro/.env` (edit with `vim /opt/fitretro/.env`):
   ```
   APP_URL="https://fitretro.app"
   RESEND_API_KEY="re_..."
   EMAIL_FROM="FitRetro <noreply@fitretro.app>"
   ```
3. `pm2 restart fitretro`.

Until these are set, production refuses to send reset emails (it never falls back to logging
them), and the forgot-password form shows a generic "couldn't send" message.

### 3. Progress pics storage — DigitalOcean Spaces (required before photos can be saved)

1. In DigitalOcean, create a Spaces bucket (~$5/mo) with **no public access** and "Restrict File
   Listing" on. Photos are only ever read through the app's owner-checked route.
2. Create a Spaces access key limited to that bucket.
3. Add to `/opt/fitretro/.env`:
   ```
   SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"   # your bucket's region, no bucket name
   SPACES_BUCKET="your-bucket-name"
   SPACES_KEY="..."
   SPACES_SECRET="..."
   ```
4. `pm2 restart fitretro`.

Until these are set, `/progress` shows a notice and accepts no uploads, and the Sunday "Progress
pic day" card on Today stays hidden.

### 4. Stripe — before real sticker signups

- **Live mode decision.** The app is test-mode only: it refuses `sk_live_` keys, and real cards
  fail in test mode. Real gym signups can't pay until this is decided and the guard is lifted
  (that's a code change — say the word).
- **FREEMONTH promo code.** The current code has a _total_ redemption limit of 1 (it read as
  "per customer" but isn't, and max redemptions can't be edited after creation). Recreate it:
  coupon 100% off, duration "once"; promotion code `FREEMONTH`, no total redemption limit,
  "first-time customers only" on. Then confirm `STRIPE_PROMO_CODE=FREEMONTH` is in `.env`.

### 5. Anthropic spend limit (recommended)

Members are capped at 20 AI actions/day, but the owner account is exempt. Set a monthly spend
limit in the Anthropic console so a runaway day can't surprise you.

### 6. One click on GitHub

Settings → General → Default branch → `main`. It's still the old `claude/quirky-maxwell-ovfba4`;
everything deploys from `main`. The proxy here can't change repository settings.

### 7. Decisions I'm waiting on

- **Today's "Log a meal" form:** should it get the same append-per-ingredient behaviour as Meal
  Prep? (Asked, unanswered.)
- **Next build order:** milestone auto-suggest from workouts, then photo/video on milestones —
  or swap them. Both are approved; neither is started.
- **Landing page clips:** you said you'd record these yourself. Send them over when ready and
  I'll wire them in.
- **App Store:** still exploratory, no decision needed yet (see the bottom of this file).

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

### Status — **done, merged (#26)**

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

## Task: Stripe test-mode hardening — **done, merged (#27)**

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

## Task: `/promo1` QR sticker route (issue #28) — **done, merged (#29)**

The sticker QR code points to `https://fitretro.app/promo1`. That route records campaign `promo1`
in a first-party `fr_campaign` cookie, then redirects:

- logged-out visitors → `/signup?next=/subscribe`
- logged-in visitors → `/subscribe`

The existing `createCheckoutSessionAction` then auto-applies `STRIPE_PROMO_CODE` via `discounts`
and tags the session and subscription metadata with `campaign=promo1` and
`acquisition_source=sticker`. If the code is missing, inactive, expired, used up, unreachable, or
rejected, checkout stops on `/subscribe` with a clear message (never a full-price fallback). Normal
checkout is unchanged. Login and signup gained a validated same-origin `next` parameter.
`/promo1` is on the first-party page-view allowlist, so scans show on `/ops`. No schema or
migration changes.

- Owner prerequisites in Stripe test mode: `FREEMONTH` must be an active promotion code whose
  coupon is 100% off with duration "once", and `STRIPE_PROMO_CODE=FREEMONTH` must be set in `.env`.
- Known gap: the site header's generic "Log in" link doesn't carry `?next=`. Attribution still
  survives that path, but the visitor lands on `/today` instead of `/subscribe`.

## Task: Production-readiness review → hardening — **in progress (PRs 1–2 of 6 open)**

An external review of `main` (2026-10-03) listed 20 findings. Verified against the code: 16
real, 2 wrong for our setup (format check — Windows line endings; the "critical" Next advisory
is Windows-only hosting), 2 needed product decisions. Owner decided: **per-user timezone: yes;
score only filled-in sets; archive templates on delete.**

Batches, each its own PR, stacked in order:

1. **Dependencies + CI (#37, open).** Next 16.3.8, sharp 0.35.5, eslint-config-next 16.3.8,
   drizzle-kit 0.31.11, transitive bumps. Audit: 20 (1 critical) → 9, all dev-only tooling.
   New `.github/workflows/ci.yml`: format/lint/typecheck/tests/all migrations on empty
   Postgres/build, plus a runtime-only audit gate. Browser suites rerun on the new build.
2. **Session revocation + rate limits + password cap (open, stacked on #37).**
   - `users.session_version` (migration 0035). Cookies carry the version they were issued with;
     `verifySession`/`getCurrentUser`/the photo route reject a mismatch. Password reset bumps it
     (signs out every other device); Settings → Security has "Log out of all devices".
     Pre-versioning cookies count as version 1 so the deploy itself logs nobody out.
   - A revoked cookie is sent through `/session/expired`, which clears it and lands on login with
     an explanation — otherwise the proxy's cookie-only check loops `/login` ↔ `/today` (found
     by the browser test).
   - `rate_limits` table + one atomic upsert per attempt (`@/features/auth/rate-limit`).
     Login 10/15 min per account (cleared on success), 60/15 min per IP; signup 30/hour per IP;
     reset request 3/hour per account, 10/hour per IP; reset submit 10/15 min per IP. Per-IP
     limits are loose on purpose: a gym's shared wifi is one IP. Concurrency proven by an
     integration test (25 parallel → exactly 5 admitted) that CI runs against its Postgres.
   - Passwords capped at 72 bytes (bcrypt's limit), counted in bytes; login passwords bounded.
   - Reset submit checks the token cheaply before paying for bcrypt; the claim stays atomic.
   - Verified: 264 unit tests; 22-check browser run (two devices, log-out-everywhere, reset
     revokes the other device, 11th wrong password throttled, right password also throttled, other
     account unaffected, 4th reset request dropped with identical reply, 74-byte password
     rejected); photos/goals/compare suites on the production build; 36 migrations on an empty DB.
3. **Next:** voice note save; dose history snapshots + archive-on-delete + real dose time.
4. Atomic AI limit; Daily Reader single-flight.
5. Billing idempotency + webhook ledger (before live mode).
6. Per-user timezone; filled-in-set scoring; validation/date/query cleanups; stale Help text.

## Task: Sticker launch readiness (stickers go out at the gym next week) — **done, merged (#31)**

Branch `claude/sticker-launch-readiness`. Everything is in one PR because two parts add migrations
(0029, 0030), and separate PRs would collide on migration slots, as #24/#26 did.

- **Double-subscribe guard:** before every checkout, expire the customer's other open Checkout
  Sessions, then ask Stripe (not the webhook table) whether a live subscription already exists.
  If one does → `/settings/billing?notice=already_subscribed`. If Stripe can't be checked →
  `billing_unavailable`.
- **Sticker attribution:** `users.signup_campaign` is set at signup; `subscriptions.campaign` is
  set from subscription metadata by the webhook. `/ops` shows scans → signups → subscriptions
  started → currently subscribed. Migration 0029: two nullable columns.
- **Password reset:** `/forgot-password` → emailed one-time link → `/reset-password`.
  - Tokens are hashed, single-use, 1-hour expiry, claimed atomically.
  - No account enumeration; 2-minute per-account cooldown.
  - Links are built from `APP_URL`, never request headers.
  - Sent via Resend (`RESEND_API_KEY`, `EMAIL_FROM`). In development the email prints to the
    console; in production nothing is logged.
  - Migration 0030: new `password_reset_tokens` table.
- **Found by the regression pass and fixed:**
  - Failed login/signup wiped the form (React 19 form reset).
  - Stripe failures crashed checkout and the portal (now fail closed; 10s Stripe timeout).
  - Settings forms overflowed phone screens, including the #26 reconstitution fields.
- **Verified:**
  - 137 unit tests.
  - All 31 migrations applied to an empty DB.
  - Production-build crawl of every page at 375px and 320px.
  - Sticker suite (26 checks) and reset suite (14 checks, real Postgres).
- **Still needs the owner:** see the checklist at the top (deploy, Resend, Stripe live mode).
- **Known limitation:** sessions are stateless JWTs, so a password reset doesn't sign out other
  devices.

## Task: Meal prep per-ingredient macro estimates — **done, merged (#32)**

Branch `claude/meal-prep-per-ingredient`. No migration.

- Each "Estimate & add" appends its ingredients to the batch. Nothing already there, including
  hand edits, is overwritten.
- One line can still hold several ingredients.
- Photos work: food on a scale (reads the display), package labels, and recipes.
- Batch-aware prompts assume raw weights and whole packages.
- The 20/day AI limit per member still applies (the owner is exempt).
- Verified with a fake AI server only. Accuracy on real photos is untested (no API key in the
  sandbox).

## Task: Progress pics (PR 1 of 2) — **done, merged (#33)**

Branch `claude/progress-pics` (was stacked on #31 for migration order; merged in sequence).

- `/progress` (nav: "Progress"):
  - A check-in has a date and front/side/back photo slots, plus optional weight, waist and body
    fat.
  - Weight, waist and body fat go into the existing `body_measurements` table (lb/in in the UI,
    kg/cm in the table).
  - The timeline is newest first, with thumbnails and that day's measurements.
  - Photos can be removed one at a time, or a whole check-in at once. Both ask for confirmation,
    and measurements are kept.
  - **Every photo is kept** (user: "save every one — it's critical to see progress"). Retaking
    a pose on the same date adds another photo; nothing is ever replaced. Photos are only deleted
    by an explicit, confirmed Remove or Delete check-in.
- Storage is a private DigitalOcean Spaces bucket (any S3-compatible store works):
  - Env vars: `SPACES_ENDPOINT`, `SPACES_BUCKET`, `SPACES_KEY`, `SPACES_SECRET`.
  - Until they're set, `/progress` shows a notice and accepts no uploads. Nothing else is
    affected.
- Privacy:
  - The phone shrinks each photo before upload, and the server re-encodes it with `sharp`. Both
    steps strip EXIF, GPS and camera data; only pixels are stored.
  - Stored sizes: full photo 1600px max (~0.5MB), thumbnail 480px (~15KB).
  - Photos are only served through `/progress/photos/[id]`, which checks ownership:
    - Anyone else gets a 404.
    - Responses are `private, no-store` and `noindex`.
    - There are no public or pre-signed URLs.
    - Photos are never sent to AI.
- Migration 0031: new `progress_photos` table only (additive). Migration 0032 drops 0031's
  one-photo-per-pose-per-day unique index (no data change). It's a new migration rather than an
  edit to 0031, because 0031 had already been pushed.
- Verified:
  - 171 unit tests, including a mutation check that the EXIF test catches leaks.
  - 42-check browser run against a production build with a fake S3 server, using three 8MB
    phone photos with GPS data.
  - All 33 migrations applied to an empty DB.
- Owner setup: see the checklist at the top (Spaces bucket + `SPACES_*`, deploy).
- PR 2 (compare, reminder, pose reference) is its own PR; see the next section.

## Task: Progress pics PR 2 (compare, reminder, pose reference) — **done, merged (#35)**

Branch `claude/progress-pics-compare` (was stacked on #34 for migration order; merged in sequence).

- **Compare** (`/progress/compare`, linked from the timeline once there are 2+ check-ins):
  - Two check-ins side by side for a chosen pose. Defaults to first vs latest; the earlier date
    is always on the left.
  - Shows the gap ("3 weeks apart") and before/after/change for weight, waist and body fat.
    Only values measured on both days are shown, with no good/bad colouring.
  - Uses the latest take of the pose that day. A missing pose shows a placeholder.
  - All state is in the URL; junk params fall back to the defaults.
- **Reminder:** a "Progress pic day 📸" card on Today.
  - Shown on the chosen weekday (Sunday by default), unless there's a check-in from the last 5
    days.
  - After 10+ days without photos it shows on any day ("It's been N days…"). It never nags
    someone who has never taken any, except on their reminder day.
  - Only when viewing the real current day, and only when photo storage is configured.
  - The day (or off) is set from a dropdown on `/progress` and saves instantly.
  - Stored in `users.progress_photo_day` (0–6, null = off, default 0).
- **Pose reference:** each empty slot in the check-in form shows last time's photo of that pose
  at 30% opacity, labelled "Last: Sep 5, 2026", to match stance and framing.
- `formatIsoDay` moved to `@/lib/date` and is shared by progress and goals.
- Migration 0034: adds the `users.progress_photo_day` column with default 0 (additive).
- Verified:
  - 230 unit tests, including the reminder rules, compare math and the reminder action.
  - A 26-check browser run against a production build with fake S3: reminder shows and clears,
    references appear, compare numbers are right, junk params are handled, another member
    can't see anything, and there's no overflow on /progress, /progress/compare or /today at
    320/375px.
  - The PR 1 and goals browser suites still pass.
  - All 35 migrations applied to an empty DB.

## Task: Goals & milestones — **done, merged (#34)**

User: wants milestones/goals. Their example: a New Year's resolution to do a muscle up, which
they achieved but can't remember the exact day of, and have done ever since.

Branch `claude/goals-milestones` (was stacked on #33 for migration order; merged in sequence).

- It's a "Goals & milestones" tab on `/progress`, next to Photos, so the nav doesn't get longer.
- A goal has a title, a start date (defaults to today; e.g. Jan 1 for a resolution), an optional
  target date, and notes.
  - Active goals show "Day N · since …" and the days left to their target. A missed target is
    flagged gently.
  - "I did it! 🏆" asks when: an exact day, a month ("sometime in March 2026") or just the year.
- A milestone is the same row with status `achieved`, so the start-to-achievement time is kept
  ("took about 2 months"). Durations are shown only as precisely as the date is known.
- Past milestones can be logged directly with "I've already done it", and the start date is
  optional for them.
- Edit and delete (with confirmation) on everything. Unchecking "Achieved" moves a milestone back
  to in progress.
- Migration 0033: new `goals` table plus the `goal_status` and `date_precision` enums
  (additive).
- Verified:
  - 211 unit tests, including date, validation, display and action tests.
  - 24-check browser run of the muscle-up flow against a production build, including privacy
    between accounts and 320/375px layout.
  - All 34 migrations applied to an empty DB.
- **Planned next (user approved, not started):**
  1. Auto-suggest a milestone the first time a workout logs a new exercise or beats a personal
     best ("First muscle up logged — add it as a milestone?").
  2. Attach a photo or video to a milestone, stored privately the same way as progress pics.
- Not planned: points toward the daily score.

### Open, unresolved (not actioned)

- Apple App Store distribution was raised as an exploratory question. Flagged tension: Apple
  generally requires In-App Purchase (not Stripe) for subscriptions sold inside an App-Store-
  distributed app. User has not made a decision here — no action pending.
