const POINTS_PER_MEAL = 5;
const POINTS_PER_ROUTINE_STEP = 5;
const POINTS_PER_WORKOUT_SET = 2;
const POINTS_PER_WORKOUT_COMPLETED = 25;
const POINTS_PER_PEPTIDE_DOSE = 5;
const POINTS_PER_SUPPLEMENT_DOSE = 5;
const POINTS_PER_NOTE = 5;

/** Matches the three /today tabs, so a day's score can be broken down the same way it's logged. */
export type ScoreTab = "nutrition" | "move" | "routine";

export type DailyScoreInput = {
  mealsLogged: number;
  routineStepsCompleted: number;
  workoutSetsLogged: number;
  workoutsCompleted: number;
  peptideDosesLogged: number;
  supplementDosesLogged: number;
  /** Notes on a completed routine step — counted toward the Routine tab. */
  routineNotesAdded: number;
  /** Notes on a logged workout — counted toward the Move tab, not Routine. */
  workoutNotesAdded: number;
};

export type DailyScoreBreakdownRow = {
  label: string;
  count: number;
  points: number;
  tab: ScoreTab;
};

export type TabScores = Record<ScoreTab, number>;

export type DailyScore = {
  total: number;
  breakdown: DailyScoreBreakdownRow[];
  byTab: TabScores;
};

/** Sums each breakdown row's points onto its tab — pure, so the per-tab totals shown on the
 * calendar can be derived (and tested) without recomputing the score itself. */
export function computeTabScores(breakdown: DailyScoreBreakdownRow[]): TabScores {
  const totals: TabScores = { nutrition: 0, move: 0, routine: 0 };
  for (const row of breakdown) {
    totals[row.tab] += row.points;
  }
  return totals;
}

/** A same-day activity score — a flat point tally over everything logged so far today. Recomputed
 * fresh on every page load (no stored score row), so it naturally rises as the day's entries come
 * in rather than needing to be updated out of band. */
export function computeDailyScore(input: DailyScoreInput): DailyScore {
  const breakdown: DailyScoreBreakdownRow[] = [
    {
      label: "Meals logged",
      count: input.mealsLogged,
      points: input.mealsLogged * POINTS_PER_MEAL,
      tab: "nutrition",
    },
    {
      label: "Routine steps",
      count: input.routineStepsCompleted,
      points: input.routineStepsCompleted * POINTS_PER_ROUTINE_STEP,
      tab: "routine",
    },
    {
      label: "Workout sets",
      count: input.workoutSetsLogged,
      points: input.workoutSetsLogged * POINTS_PER_WORKOUT_SET,
      tab: "move",
    },
    {
      label: "Workouts completed",
      count: input.workoutsCompleted,
      points: input.workoutsCompleted * POINTS_PER_WORKOUT_COMPLETED,
      tab: "move",
    },
    {
      label: "Peptide doses",
      count: input.peptideDosesLogged,
      points: input.peptideDosesLogged * POINTS_PER_PEPTIDE_DOSE,
      tab: "routine",
    },
    {
      label: "Supplement doses",
      count: input.supplementDosesLogged,
      points: input.supplementDosesLogged * POINTS_PER_SUPPLEMENT_DOSE,
      tab: "routine",
    },
    {
      label: "Routine notes",
      count: input.routineNotesAdded,
      points: input.routineNotesAdded * POINTS_PER_NOTE,
      tab: "routine",
    },
    {
      label: "Workout notes",
      count: input.workoutNotesAdded,
      points: input.workoutNotesAdded * POINTS_PER_NOTE,
      tab: "move",
    },
  ];

  return {
    total: breakdown.reduce((sum, row) => sum + row.points, 0),
    breakdown,
    byTab: computeTabScores(breakdown),
  };
}
