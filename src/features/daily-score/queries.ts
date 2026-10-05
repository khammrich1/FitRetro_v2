import { computeDailyScore, type DailyScore } from "@/lib/daily-score";
import { toIsoDate } from "@/lib/date";
import { countEntriesPerDay, getEntriesForDay } from "@/features/nutrition";
import { getRoutineCompletionStatsInRange, getRoutinesForUser } from "@/features/routines";
import { getWorkoutScoreStatsInRange, getWorkoutsForDay } from "@/features/workouts";
import { countPeptideLogsPerDay, getPeptideLogsForDay } from "@/features/peptides";
import { countSupplementLogsPerDay, getSupplementLogsForDay } from "@/features/supplements";

type WorkoutDetailLike = {
  workout: { completedAt: Date | null };
  exercises: { sets: { loggedAt: Date | null }[] }[];
};

/** Sets that count toward the score: ones the member has edited, or every set once the workout
 * is finished. A template's untouched pre-filled sets are plans, not points. */
export function countPerformedSets(detail: WorkoutDetailLike): number {
  const sets = detail.exercises.flatMap((exercise) => exercise.sets);
  if (detail.workout.completedAt !== null) return sets.length;
  return sets.filter((set) => set.loggedAt !== null).length;
}

/** Same score calculation /today uses, factored out so the calendar month view can compute it
 * per day without duplicating the derivation logic. Fetches everything itself rather than taking
 * pre-fetched data, since /today already needs its own fetches for rendering (entries, routines,
 * etc.) beyond just the score — keeping this self-contained avoids coupling the two call sites'
 * data shapes together. */
export async function getDailyScoreForDay(userId: string, day: Date): Promise<DailyScore> {
  const [entries, routines, workoutDetails, peptideLogs, supplementLogs] = await Promise.all([
    getEntriesForDay(userId, day),
    getRoutinesForUser(userId, day),
    getWorkoutsForDay(userId, day),
    getPeptideLogsForDay(userId, day),
    getSupplementLogsForDay(userId, day),
  ]);

  const workoutList = workoutDetails.filter((detail) => detail !== null);
  const completedWorkouts = workoutList.filter((detail) => detail.workout.completedAt !== null);

  return computeDailyScore({
    mealsLogged: entries.length,
    routineStepsCompleted: routines.reduce(
      (sum, routine) => sum + routine.items.filter((item) => item.completedToday).length,
      0,
    ),
    workoutSetsLogged: workoutList.reduce((sum, detail) => sum + countPerformedSets(detail), 0),
    workoutsCompleted: completedWorkouts.length,
    peptideDosesLogged: peptideLogs.length,
    supplementDosesLogged: supplementLogs.length,
    routineNotesAdded: routines.reduce(
      (sum, routine) =>
        sum + routine.items.filter((item) => Boolean(item.completionNotes?.trim())).length,
      0,
    ),
    workoutNotesAdded: workoutList.filter((detail) => Boolean(detail.workout.notes?.trim())).length,
  });
}

/** Every day's score for one month, from one range query per domain (five in total) instead of
 * five per day plus nested reads — the same numbers getDailyScoreForDay gives, computed in bulk.
 * `month` is 1-indexed. Days with no activity are present with a zero score. */
export async function getDailyScoresForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Map<string, DailyScore>> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(end);

  const [meals, routineStats, workoutStats, peptideDoses, supplementDoses] = await Promise.all([
    countEntriesPerDay(userId, start, end),
    getRoutineCompletionStatsInRange(userId, startIso, endIso),
    getWorkoutScoreStatsInRange(userId, start, end),
    countPeptideLogsPerDay(userId, startIso, endIso),
    countSupplementLogsPerDay(userId, startIso, endIso),
  ]);

  const scores = new Map<string, DailyScore>();
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const day = toIsoDate(d);
    const workouts = workoutStats.filter((w) => w.day === day);
    const routine = routineStats.get(day) ?? { completed: 0, withNotes: 0 };
    scores.set(
      day,
      computeDailyScore({
        mealsLogged: meals.get(day) ?? 0,
        routineStepsCompleted: routine.completed,
        workoutSetsLogged: workouts.reduce((sum, w) => sum + w.performedSets, 0),
        workoutsCompleted: workouts.filter((w) => w.completed).length,
        peptideDosesLogged: peptideDoses.get(day) ?? 0,
        supplementDosesLogged: supplementDoses.get(day) ?? 0,
        routineNotesAdded: routine.withNotes,
        workoutNotesAdded: workouts.filter((w) => w.hasNotes).length,
      }),
    );
  }
  return scores;
}
