import { computeDailyScore, type DailyScore } from "@/lib/daily-score";
import { getEntriesForDay } from "@/features/nutrition";
import { getRoutinesForUser } from "@/features/routines";
import { getWorkoutsForDay } from "@/features/workouts";
import { getPeptideLogsForDay } from "@/features/peptides";
import { getSupplementLogsForDay } from "@/features/supplements";

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
    workoutSetsLogged: workoutList.reduce(
      (sum, detail) => sum + detail.exercises.reduce((s, ex) => s + ex.sets.length, 0),
      0,
    ),
    workoutsCompleted: completedWorkouts.length,
    peptideDosesLogged: peptideLogs.length,
    supplementDosesLogged: supplementLogs.length,
    notesAdded:
      routines.reduce(
        (sum, routine) =>
          sum + routine.items.filter((item) => Boolean(item.completionNotes?.trim())).length,
        0,
      ) + workoutList.filter((detail) => Boolean(detail.workout.notes?.trim())).length,
  });
}
