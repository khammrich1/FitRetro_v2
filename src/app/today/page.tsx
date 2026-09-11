import { verifySession, getCurrentUser } from "@/features/auth";
import { toIsoDate, parseDayParam } from "@/lib/date";
import { computeDailyScore } from "@/lib/daily-score";
import { parseMacroOrder } from "@/lib/macro-order";
import { parseReadingTopics } from "@/lib/reading-topics";
import { getReadingsForDay, ensureTodaysReadings } from "@/features/daily-reading";
import { DayNav } from "@/components/ui/day-nav";
import {
  getGoals,
  getEntriesForDay,
  summarizeMacros,
  getMealTemplatesForUser,
} from "@/features/nutrition";
import { getRoutinesForUser } from "@/features/routines";
import { getMissionForDay } from "@/features/daily-mission";
import {
  getSplitCycleTargetForDate,
  getWorkoutsForDay,
  getTemplatesForUser,
} from "@/features/workouts";
import {
  getPeptideTemplatesForUser,
  getPeptideLogsForDay,
  getMostRecentLogDates,
} from "@/features/peptides";
import {
  getSupplementTemplatesForUser,
  getSupplementLogsForDay,
  getMostRecentSupplementLogDates,
} from "@/features/supplements";
import { getWaterIntakeForDay } from "@/features/water";
import { getDailyNoteForDay } from "@/features/daily-note";
import { listPantryItems } from "@/features/pantry";
import { TodayTabs } from "./_components/today-tabs";
import { NutritionTab } from "./_components/tabs/nutrition-tab";
import { MoveTab } from "./_components/tabs/move-tab";
import { RoutineTab } from "./_components/tabs/routine-tab";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId } = await verifySession();
  const { date: dateParam } = await searchParams;
  const day = parseDayParam(dateParam);
  const dayIso = toIsoDate(day);
  const todayIso = toIsoDate(new Date());

  const user = await getCurrentUser();
  const readingTopics = parseReadingTopics(user?.readingTopics);
  // Only ever generate for the actual current day, never a past/future day reached via DayNav.
  if (dayIso === todayIso) {
    await ensureTodaysReadings(readingTopics);
  }

  const [
    goal,
    entries,
    mealTemplates,
    routines,
    mission,
    splitTarget,
    workoutDetails,
    templates,
    peptideTemplates,
    peptideLogs,
    mostRecentPeptideLogDates,
    supplementTemplates,
    supplementLogs,
    mostRecentSupplementLogDates,
    waterOunces,
    dailyNote,
    pantryItems,
    readings,
  ] = await Promise.all([
    getGoals(userId),
    getEntriesForDay(userId, day),
    getMealTemplatesForUser(userId),
    getRoutinesForUser(userId, day),
    getMissionForDay(userId, day),
    getSplitCycleTargetForDate(userId, day),
    getWorkoutsForDay(userId, day),
    getTemplatesForUser(userId),
    getPeptideTemplatesForUser(userId),
    getPeptideLogsForDay(userId, day),
    getMostRecentLogDates(userId, day),
    getSupplementTemplatesForUser(userId),
    getSupplementLogsForDay(userId, day),
    getMostRecentSupplementLogDates(userId, day),
    getWaterIntakeForDay(userId, day),
    getDailyNoteForDay(userId, day),
    listPantryItems(userId),
    getReadingsForDay(day, readingTopics),
  ]);

  const macroOrder = parseMacroOrder(user?.macroOrder);
  const consumed = summarizeMacros(entries);
  const workoutList = workoutDetails.filter((detail) => detail !== null);
  const inProgressWorkouts = workoutList.filter((detail) => detail.workout.completedAt === null);
  const completedWorkouts = workoutList.filter((detail) => detail.workout.completedAt !== null);
  const targetMuscleGroups = splitTarget?.muscleGroups ?? [];
  const mostRecentPeptideLogDatesByTemplateId = Object.fromEntries(mostRecentPeptideLogDates);
  const mostRecentSupplementLogDatesByTemplateId = Object.fromEntries(mostRecentSupplementLogDates);

  const dailyScore = computeDailyScore({
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Today</h1>

      <DayNav dayIso={dayIso} todayIso={todayIso} />

      <TodayTabs
        nutrition={
          <NutritionTab
            score={dailyScore}
            dayIso={dayIso}
            consumed={consumed}
            goal={goal}
            macroOrder={macroOrder}
            waterOunces={waterOunces}
            mealTemplates={mealTemplates}
            pantryItems={pantryItems}
            entries={entries}
          />
        }
        move={
          <MoveTab
            dayIso={dayIso}
            splitTarget={splitTarget}
            inProgressWorkouts={inProgressWorkouts}
            completedWorkouts={completedWorkouts}
            targetMuscleGroups={targetMuscleGroups}
            templates={templates}
          />
        }
        routine={
          <RoutineTab
            dayIso={dayIso}
            routines={routines}
            mission={mission}
            note={dailyNote}
            readings={readings}
            peptideTemplates={peptideTemplates}
            peptideLogs={peptideLogs}
            mostRecentPeptideLogDates={mostRecentPeptideLogDatesByTemplateId}
            supplementTemplates={supplementTemplates}
            supplementLogs={supplementLogs}
            mostRecentSupplementLogDates={mostRecentSupplementLogDatesByTemplateId}
          />
        }
      />
    </div>
  );
}
