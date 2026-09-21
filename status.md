# FitRetro — Live Status

_Last updated: 2026-09-21 (Stripe framework pushed, PR opened)_

This file tracks in-progress work across sessions so context isn't lost between compactions/restarts. Update it whenever a task's state changes — don't let it go stale.

## Safety rules (standing, from CLAUDE.md)

- Never run a migration or destructive DB command without a `pg_dump` backup immediately before it, no exceptions, regardless of environment.
- Migrations are per-slot files under `drizzle/` — once a migration file has existed, never delete/regenerate it to reshape a table again. Add a new migration instead.
- Deploys to production (`/opt/fitretro`) only ever happen via a command handed to the user to run themselves — no direct droplet access from here.

## Active task: Stripe billing framework + mobile formatting fixes

User's instruction: "Finish up stripe and also there's some weird formatting issues on the web for mobile."

### 1. Stripe billing framework — **done, PR open**

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
- [x] PR opened into `main`

Not testable live in this sandbox: real Stripe checkout/webhook round-trip (no real `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` configured here) — noted in the PR body.

Not done (intentionally out of scope for this pass): no paywall/gating anywhere, no UI to enter a promo code manually on `/subscribe` beyond the `?promo=` query param + Stripe Checkout's own manual-entry field, no admin view of all subscribers.

**Note:** this work was originally built in a prior container session but never committed before that container was reclaimed (idle timeout) — it had to be rebuilt from scratch in this fresh container. Lesson: commit/push working state more eagerly instead of batching everything to the end of a long task.

### 2. Mobile formatting issues — **not started**

User flagged "weird formatting issues on the web for mobile" with no screenshot or specific
page given yet. Plan: once Stripe is pushed/PR'd, either ask the user for specifics/a screenshot,
or proactively run a mobile-viewport visual QA pass (playwright-core scratchpad tooling already
set up earlier this session) across recently-changed pages (`/today`, `/calendar`, Daily Reader,
now also `/subscribe` and `/settings/billing`) to look for obvious breakage.

### Open, unresolved (not actioned)

- Apple App Store distribution was raised as an exploratory question. Flagged tension: Apple
  generally requires In-App Purchase (not Stripe) for subscriptions sold inside an App-Store-
  distributed app. User has not made a decision here — no action pending.
