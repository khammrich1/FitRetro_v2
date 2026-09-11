/** User-facing "what's new" list shown on /feedback. Newest first — add a new entry at the
 * top whenever a user-visible change ships. Not auto-generated from commits/PRs, since those
 * are written for reviewers, not for the people using the app. */
export type ChangelogEntry = {
  /** "YYYY-MM-DD" */
  date: string;
  title: string;
  description?: string;
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-09-11",
    title: "Today is now split into tabs",
    description:
      "Nutrition, Move, and Routine tabs on the Today page, so logging a meal doesn't mean scrolling past your workouts and routine first. Empty sections (no routines, no peptides, etc.) are hidden instead of showing setup reminders.",
  },
  {
    date: "2026-09-10",
    title: "Quick Log supports logging more than one at a time",
    description:
      'Pick a quantity before tapping "Log" on a pantry item — handy for a case of protein shakes or anything you go through more than one of per sitting.',
  },
  {
    date: "2026-09-09",
    title: "Pantry items can now have macros, AI-estimated",
    description:
      "Add store-bought items like protein shakes or yogurt with their own macros — estimate them with AI, or type them in yourself. You can also edit the portions and macros on anything already in your pantry, including prepped meals.",
  },
  {
    date: "2026-09-04",
    title: "Macro order is now customizable",
    description:
      "Choose the order fat/carbs/protein show in from Settings — applies everywhere macros are displayed, on Today, Pantry, and Meal Prep.",
  },
];

/** Parses/formats a "YYYY-MM-DD" using UTC-anchored arithmetic, so the displayed date doesn't
 * shift a day depending on the server's or browser's local timezone. */
export function formatChangelogDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
