# Workout session guide

Approved scope: 2026-10-04. Implementation tracked in [issue #43](https://github.com/khammrich1/FitRetro_v2/issues/43). Status: scoped, not implemented or deployed.

## Outcome

On a phone, the owner can open a compact guide in /today's workout area that explains the session sequence and shows warm-up mobility and cooldown stretches relevant to the selected day's workout split.

## Owner-requested structure

1. Cardio warm-up: approximately 7 minutes.
2. Dynamic mobility for the day's muscle groups.
3. Lifting, beginning with lighter warm-up sets.
4. Post-lifting cardio.
5. Gentle static cooldown stretching.

Seven minutes is the owner's preference, not a universal prescription. Do not invent a required post-lifting cardio duration.

## Implementation scope

- Collapsible guide in /today; keep logging controls immediately accessible.
- Use the viewed date and existing split schedule, not always today's real date.
- Deterministic, reviewed routine content keyed by existing muscle groups; combine and deduplicate for mixed days.
- Separate dynamic pre-lifting movements from static post-lifting stretches, with names, short instructions, repetitions or hold durations, and target areas.
- Back/biceps example: shoulder mobility, upper-back rotation, lats, biceps, and forearms. Select actual movements from reputable exercise guidance; cite sources in the content documentation.
- Rest/unscheduled days show a neutral general guide without inventing a scheduled workout.
- Explain gentle, comfortable range of motion; no forced painful stretches or injury-specific treatment.

## Likely areas

src/app/today/_components/workouts/, src/app/today/page.tsx, src/features/workouts/ split lookup and new static guide content; relevant workout docs.

## Owner-testable acceptance

- On my phone I can see cardio → dynamic mobility → lifting → cardio → cooldown in order.
- On back/biceps day I can expand relevant instructions without leaving my workout logging screen.
- Changing the viewed date changes the guide to that day's split.
- Mixed muscle groups do not repeat the same movement; rest days behave clearly.
- Logging still works with no horizontal overflow at 320px and 375px.
- No API key or paid AI request is needed.

## Non-goals

AI coaching, recovery assessment, wearables, native app, videos, timers, completion points, rewriting workout logging, or a new routine configuration system. Optional AI customization is backlog only.

## Migration

None expected: use static content and existing split data. If persistence is proposed, stop and scope that separately.

## Delivery

Read CLAUDE.md and AGENTS.md; branch from main, required quality checks, PR for owner review, deploy to d.fitretro.app for owner acceptance. Do not merge or deploy production automatically. This ticket does not displace the current Spaces/Resend/Stripe setup work.
