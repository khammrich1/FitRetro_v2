# Daily experience and hardening follow-up audit

Reviewed October 4, 2026 (America/Los_Angeles). Initial review base: `main` at `afa453b`, including merged hardening PRs #39–42. The implementation was rebased and reverified on `0ae22ca`, which also includes workout-session guide PR #45. This is a follow-up audit of the hardening changes and everyday product experience, with a focused implementation PR. It does not replace staging acceptance or certify production as defect-free.

## What changed since the first audit

The new main branch includes session-version checks and reset revocation; atomic per-user AI admission; authentication throttling; strict calendar-day validation and member timezone selection; snapshot/archived dose history with actual administration-time handling; performed-set scoring; transactional pantry logging; serialized checkout admission and idempotent customer creation; webhook event recording/ordering; range-based calendar scoring; dependency upgrades and CI with PostgreSQL integration tests.

These are meaningful improvements. Source review and local tests support the changes, but the local database integration suites were skipped because no disposable test database was connected. Applying migrations and verifying the deployed configuration are still part of release acceptance. A read-only live inspection of `https://d.fitretro.app/today` initially showed `20f073c`, then showed `afa453b` after the user's update. The final observation matches this PR's base.

## Product findings addressed in this PR

| Finding                                                                   | User impact                                                                                                | Change                                                                                               |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Switching Today tabs unmounts the active section                          | An unfinished meal/workout disappears when checking another section                                        | Preserve panel state with React Activity; hide inactive panels and clean up their effects            |
| Tabs lack panel relationships, roving focus and arrow navigation          | Keyboard and assistive-technology users cannot navigate the control predictably                            | Tab/panel IDs, labels, one tab stop, wrapping arrows, Home/End, visible focus                        |
| Navigation presents eight or more equally prominent destinations          | Particularly crowded on phones; no location indication                                                     | Four primary links, active-route indication, a More disclosure with secondary/owner links and logout |
| Score is one unexplained total, including on past dates                   | Hard to understand what contributed; historical days are called Today                                      | Nutrition/Move/Routine breakdown, optional entry details, date-aware wording                         |
| Missing macro targets produces an instruction without a link              | New members have to find the correct settings page themselves                                              | Friendly setup card linking directly to nutrition targets; logging stays available                   |
| Journal undo leaves an earlier timer/write alive                          | Text can revert to an edit the person already undid                                                        | Cancel an unsent edit and queue the final undo behind an in-flight save                              |
| Failed journal saves require a further edit to retry                      | Unclear recovery; users may close the editor thinking they must retype                                     | Explicit Retry save button, alert text and accessible textarea name                                  |
| Journal collapse recreates the editor from potentially stale server props | Recently saved text appears to vanish on reopening                                                         | Keep the editor state and save queue across collapse; hidden effects still clean up                  |
| Draft key contains only the day                                           | A second account using the same browser tab can load and automatically save someone else's unsaved journal | Scope new drafts by member ID plus day; do not adopt unattributed legacy drafts                      |

Tab state is retained while switching sections on the same day. Selecting a different day intentionally creates new panel state so a previous day's meal/workout draft is not submitted under the new date. This is not an offline-sync or cross-device draft implementation. React Activity keeps hidden state while cleaning up effects, which also stops an active speech-recognition effect when its section is hidden; see the [React reference](https://react.dev/reference/react/Activity).

The visual changes preserve the existing purple/green identity, add clearer type hierarchy and spacing, larger navigation targets and a calmer daily summary. They do not change score rules, create new dose incentives, add provider calls or require migrations.

## Remaining findings and operational checks

### P1 before live billing: ambiguous webhook ordering and initial-row races

[`decideSubscriptionEvent`](../src/features/billing/ordering.ts) rejects only timestamps strictly older than stored timestamps. Distinct events created in the same second remain arrival-order-dependent, including transitions on the same subscription and replacement subscriptions with equal creation timestamps. A timestamp is not a complete provider-state ordering guarantee.

[`applySubscriptionEvent`](../src/features/billing/queries.ts) selects a subscription row FOR UPDATE before upserting. When no row exists, there is nothing to lock: two initial events can both decide against an empty state and later upsert in the opposite order. Lock a stable existing user/advisory key before reading, then reconcile ambiguous cases with authoritative provider state. Add tests for equal-second events and simultaneous first events. These are source-supported residual risks; no real Stripe events or charges were sent in this review.

### P2: photo deletion and upload recovery remain best-effort

[`saveCheckInAction` and deletion actions](../src/app/progress/actions.ts) still write objects before the DB row and remove DB rows before best-effort object cleanup. Cleanup failures discard the keys needed to retry. An image can remain in storage after the UI says it was deleted. Measurement persistence happens after photo persistence, so an error can arrive after partial success. Use a durable cleanup outbox, orphan reconciliation and retry-safe check-in IDs; verify quotas and processing concurrency. Privacy access controls and EXIF stripping are good, but do not guarantee eventual deletion.

### P2: global AI cost ceiling is not a strict reservation

[`checkAiUsageAllowed`](../src/features/ai-usage/limit.ts) now enforces per-user admission atomically. Its global guard is still a read of aggregate usage, followed by a separate per-user reservation. Accounts in different timezones key usage to different calendar days, which also makes a single global calendar-day sum an imperfect spending window. [`generateAndCacheReading`](../src/features/daily-reading/queries.ts) checks that total but does not reserve/count the reading generation itself. Use a separate global UTC/window budget reservation for all paid operations and track actual provider usage. The current guard reduces risk, but should not be described as an exact spending bound.

### P2: trusted-proxy assumptions need verification

[`requestIp`](../src/features/auth/rate-limit.ts) uses the first forwarded IP entry or X-Real-IP. Confirm the external proxy replaces/sanitizes those headers, blocks direct application access and supplies a trusted client address. Otherwise an attacker may choose IP buckets. Do not assume that a header-based limiter by itself proves production brute-force protection.

### P2: retry safety and cross-device consistency

Journal saves are serialized within the same retained editor. They are not versioned across browser tabs/devices. Network retries can still duplicate several logging mutations; a refresh does not preserve all manually composed meal/workout drafts. Add mutation IDs, durable draft lifecycle rules and server revision checks where concurrent editing matters. Session-scoped journal storage is plaintext browser storage: account scoping prevents automatic cross-account adoption, but is not encryption or a shared-device retention policy. Legacy unscoped drafts are not read or deleted by this change because their ownership is unknown.

### P2: CI formatting baseline is currently failing

Local `npm run format:check` after rebasing reports 303 files, including historical source/configuration and migration metadata. Changed PR files pass a targeted Prettier check. The CI workflow runs the global formatter check first, so it will remain a release blocker until the existing baseline is fixed in a dedicated formatting change. This PR is a draft for review rather than a claim that all required CI checks are green.

### Still require deployment evidence

- Restore a disposable environment from DB and photo backups; record recovery time and acceptable data-loss window.
- Verify HTTPS/secure cookies, private bucket policy, deployed migration journal, least-privilege credentials, database TLS and actual deployed commit.
- Confirm CI integration suites execute against PostgreSQL, required branch checks are enforced, and dependency scanning stays enabled.
- Exercise two-user ownership boundaries, stale-session rejection, backfilled dose timing, provider failures and shuffled/concurrent webhook delivery on staging.
- Add operational alerts for failed saves, webhook lag, AI spend and cleanup failures; avoid logging journals, photos, credentials or reset tokens.
- Decide account export/deletion/retention and installation/offline requirements. No service worker or complete offline-write flow was established by this review.

## Suggestions for an experience people enjoy

These are product hypotheses based on the current flows, not claims of measured user demand. Validate them with short usability sessions and privacy-preserving product metrics.

1. **Make the first useful action effortless.** Offer a brief, dismissible setup path: choose a nutrition target, save a familiar meal, or create one workout. Let people skip it. Measure time to the first saved entry and first-week return rate rather than setup completion alone.
2. **Put manual logging and recent favorites first.** On Nutrition, Food suggestions currently sits before the main log form; its explanation is long. Move the main action and recent/template meals higher, keep AI optional, and use progressive disclosure for secondary instructions. Test quick logging with a phone in one hand.
3. **Add a meaningful weekly reflection.** Show workout consistency, personal milestones and trends with clear date ranges and missing-data handling. Let users pick which measures matter. Avoid implying that more entries or more doses equals better health.
4. **Offer recovery-friendly feedback.** A rest day, partial day or missed day should not feel like failure. Consider optional streaks that count a user-defined habit; celebrate achieved goals rather than raw volume. Revisit whether dose entries should receive gamification points at all.
5. **Protect work everywhere.** Extend account/day-scoped drafts and explicit save/retry states to meals, workout composition and routine notes. Offer reversible undo for ordinary logged entries where data semantics permit it.
6. **Build a convenient workout companion.** Rest timers, last-performed set values and a concise next-exercise view would reduce interaction during a session. Keep controls large and distinguish prescribed targets from recorded results.
7. **Invest in complete mobile accessibility.** Finish form labels, screen-reader progress announcements, focus placement after errors, color contrast and touch-target checks across all screens. Test Safari and Android Chrome with real photo/voice flows.
8. **Make feedback easy and bounded.** Ask a small number of opt-in users what slowed them down after a real task. Prioritize repeat friction over adding more sections. Give any analytics an explicit privacy/retention policy.

## Verification for this PR

- Local focused regression tests cover retained tab drafts, day-change isolation, keyboard tab navigation, hidden-effect cleanup, journal undo before/after an in-flight write, account-separated drafts, collapse/reopen and retry recovery.
- Navigation tests cover nested owner routes, one current-page link, Escape closing and focus return.
- Full local suite after rebasing onto `0ae22ca`: 331 passed, 14 PostgreSQL integration tests skipped; these must run in CI/staging.
- Typecheck, lint and production build passed with audit-only placeholder environment values. The build did not connect to production services.
- Runtime `npm audit --omit=dev`: zero reported advisories at review time.
- Changed files pass Prettier; repository-wide formatting has the existing failure described above.
- Local browser component fixture: desktop and 390×844 phone layout inspected; an unfinished meal remained after switching tabs and returning; More opened/closed and Escape restored focus. Fixture data and provider actions were mocked, so this is component/browser evidence rather than a connected full-app transaction test.
- Live dev inspection was read-only. No user entries were submitted, subscriptions created, photos changed or production migrations run.

No production migration or deployment is required to review this PR. Merge only after required checks are resolved and the real authenticated staging flows have been exercised.
