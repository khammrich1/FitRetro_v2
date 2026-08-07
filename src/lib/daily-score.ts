const POINTS_PER_MEAL = 5;
const POINTS_PER_ROUTINE_STEP = 5;
const POINTS_PER_WORKOUT_SET = 2;
const POINTS_PER_WORKOUT_COMPLETED = 25;
const POINTS_PER_PEPTIDE_DOSE = 5;
const POINTS_PER_SUPPLEMENT_DOSE = 5;
const POINTS_PER_NOTE = 5;

export type DailyScoreInput = {
  mealsLogged: number;
  routineStepsCompleted: number;
  workoutSetsLogged: number;
  workoutsCompleted: number;
  peptideDosesLogged: number;
  supplementDosesLogged: number;
  notesAdded: number;
};

export type DailyScoreBreakdownRow = {
  label: string;
  count: number;
  points: number;
};

export type DailyScore = {
  total: number;
  breakdown: DailyScoreBreakdownRow[];
};

/** A same-day activity score — a flat point tally over everything logged so far today. Recomputed
 * fresh on every page load (no stored score row), so it naturally rises as the day's entries come
 * in rather than needing to be updated out of band. */
export function computeDailyScore(input: DailyScoreInput): DailyScore {
  const breakdown: DailyScoreBreakdownRow[] = [
    {
      label: "Meals logged",
      count: input.mealsLogged,
      points: input.mealsLogged * POINTS_PER_MEAL,
    },
    {
      label: "Routine steps",
      count: input.routineStepsCompleted,
      points: input.routineStepsCompleted * POINTS_PER_ROUTINE_STEP,
    },
    {
      label: "Workout sets",
      count: input.workoutSetsLogged,
      points: input.workoutSetsLogged * POINTS_PER_WORKOUT_SET,
    },
    {
      label: "Workouts completed",
      count: input.workoutsCompleted,
      points: input.workoutsCompleted * POINTS_PER_WORKOUT_COMPLETED,
    },
    {
      label: "Peptide doses",
      count: input.peptideDosesLogged,
      points: input.peptideDosesLogged * POINTS_PER_PEPTIDE_DOSE,
    },
    {
      label: "Supplement doses",
      count: input.supplementDosesLogged,
      points: input.supplementDosesLogged * POINTS_PER_SUPPLEMENT_DOSE,
    },
    {
      label: "Notes added",
      count: input.notesAdded,
      points: input.notesAdded * POINTS_PER_NOTE,
    },
  ];

  return {
    total: breakdown.reduce((sum, row) => sum + row.points, 0),
    breakdown,
  };
}
