# Workout session guide

Approved scope: 2026-10-04. Implementation tracked in [issue #43](https://github.com/khammrich1/FitRetro_v2/issues/43). Status: implemented (2026-10-05), in PR for owner review; not deployed. See [Implementation notes](#implementation-notes) and [Sources](#sources) below.

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

## Implementation notes

- **Content:** `src/features/workouts/session-guide.ts`. The five-step sequence (`SESSION_SEQUENCE`) and two catalogs keyed by the existing `muscle_group` enum: `DYNAMIC` (pre-lifting mobility, reps) and `STATIC` (post-cardio stretches, holds). Every movement has a stable `id`, a name, one or two sentences of instruction, a dose and target areas. A movement that belongs to several groups (e.g. arm circles for chest, back, shoulders) is one object reused under one id, so `buildSessionGuide(["back", "biceps"])` shows it once, in the first group's order, then appends the other groups' new movements.
- **Rest/unscheduled days:** `buildSessionGuide(null | [])` returns `{ kind: "rest" }` with the fixed `REST_DAY_DYNAMIC` / `REST_DAY_STATIC` sets and no sequence. The card says no workout is scheduled instead of inventing one.
- **UI:** `src/app/today/_components/workouts/session-guide-card.tsx`, rendered by the Move tab (`tabs/move-tab.tsx`) between the split/workout cards and the logging form. Collapsed by default (`aria-expanded`); expanding it does not move the logging controls out of reach. The guide is computed server-side from the same `splitTarget` the Move tab already resolves for the viewed `?date=`, so paging to another day changes the guide with it.
- **Not included:** no AI call, no persistence or migration, no timers, videos or points. The wording keeps to comfortable range of motion and tells the member to skip anything that hurts; it is general guidance, not treatment.
- **Tests:** `session-guide.test.ts` (sequence, catalog completeness, dedupe, rest day, no forced-range language) and `session-guide-card.test.tsx` (collapsed by default, order of steps, rest-day copy).

## Sources

The structure is the owner's. Movement selection, dosing and the gentle-range wording follow general, publicly available guidance; none of it is medical advice.

- ACSM, _ACSM's Guidelines for Exercise Testing and Prescription_, 11th ed. (Wolters Kluwer, 2021), chapter 6: 5–10 minutes of light-to-moderate cardio as a warm-up and again as a cooldown; flexibility work most effective when muscles are warm; static stretches held 10–30 s to the point of tightness or slight discomfort, repeated 2–4 times. Basis for the warm-up/cooldown placement and the "Hold 20–30 s" doses.
- NSCA, _Essentials of Strength Training and Conditioning_, 4th ed. (Human Kinetics, 2016), chapter 14 "Warm-Up and Flexibility Training": a general warm-up followed by a specific, dynamic warm-up before lifting; static stretching placed after training rather than immediately before it. Basis for separating the dynamic (before) and static (after) catalogs.
- American Council on Exercise (ACE) Exercise Library, https://www.acefitness.org/resources/everyone/exercise-library/ — cueing for the individual movements (arm circles, band pull-aparts, wall slides, cat–cow, thoracic rotations, scapular pull-ups, leg swings, hip circles, glute bridges, bodyweight squats, inchworms, doorway chest stretch, child's pose, figure-four, standing quad, hamstring, calf and hip-flexor stretches, wrist flexor/extensor stretches).
- NHS, "How to stretch after exercising" (nhs.uk, Live Well › Exercise): hold each stretch gently without bouncing, breathe, and stop if it hurts. Basis for the safety footer wording.
- Back/biceps coverage requested by the owner (shoulder mobility, upper-back rotation, lats, biceps, forearms) maps to: arm circles, band pull-aparts, wall slides, scapular pull-ups (shoulders); thoracic rotations, cat–cow (upper back); lat stretch, child's pose (lats); wall biceps stretch (biceps); wrist circles, wrist flexor/extensor stretches (forearms).
