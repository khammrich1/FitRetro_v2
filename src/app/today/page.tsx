import { after } from "next/server";
import { verifySession, getCurrentUser } from "@/features/auth";
import { toIsoDate, parseDayParam } from "@/lib/date";
import { computeDailyScore } from "@/lib/daily-score";
import { parseMacroOrder } from "@/lib/macro-order";
import { parseReadingTopics, pickTodaysTopic } from "@/lib/reading-topics";
import { getReadingForDayAndTopic, generateAndCacheReading } from "@/features/daily-reading";
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
  getLogTimestampsForDecay,
  currentLevelPercent,
} from "@/features/peptides";
import {
  getSupplementTemplatesForUser,
  getSupplementLogsForDay,
  getMostRecentSupplementLogDates,
} from "@/features/supplements";
import { getWaterIntakeForDay } from "@/features/water";
import { getDailyNoteForDay } from "@/features/daily-note";
import { listPantryItems } from "@/features/pantry";
import { getLastProgressPhotoDay, progressPhotoReminder } from "@/features/progress-photos";
import { isObjectStorageConfigured } from "@/lib/object-storage";
import { DailyScoreCard } from "./_components/daily-score-card";
import { ProgressPhotoReminderCard } from "./_components/progress-photo-reminder-card";
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
  const todaysTopic = pickTodaysTopic(readingTopics, dayIso);

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
    logTimestampsForDecay,
    supplementTemplates,
    supplementLogs,
    mostRecentSupplementLogDates,
    waterOunces,
    dailyNote,
    pantryItems,
    reading,
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
    getLogTimestampsForDecay(userId),
    getSupplementTemplatesForUser(userId),
    getSupplementLogsForDay(userId, day),
    getMostRecentSupplementLogDates(userId, day),
    getWaterIntakeForDay(userId, day),
    getDailyNoteForDay(userId, day),
    listPantryItems(userId),
    getReadingForDayAndTopic(dayIso, todaysTopic),
  ]);

  // Only the actual current day ever generates — a cache miss on a past/future day reached via
  // DayNav just means nothing to show, never a retroactive generation. Scheduled via after() so
  // a miss never blocks this response; whoever hits /today next that day sees the cached result.
  if (dayIso === todayIso && todaysTopic && !reading) {
    after(() => generateAndCacheReading(dayIso, todaysTopic));
  }

  // Progress-pic reminder: only on the real current day (not a day browsed via DayNav), and only
  // when photos can actually be saved.
  const photoReminder =
    dayIso === todayIso && isObjectStorageConfigured()
      ? progressPhotoReminder({
          reminderDay: user?.progressPhotoDay,
          todayIso,
          lastPhotoDay: await getLastProgressPhotoDay(userId),
        })
      : null;

  const macroOrder = parseMacroOrder(user?.macroOrder);
  const consumed = summarizeMacros(entries);
  const workoutList = workoutDetails.filter((detail) => detail !== null);
  const inProgressWorkouts = workoutList.filter((detail) => detail.workout.completedAt === null);
  const completedWorkouts = workoutList.filter((detail) => detail.workout.completedAt !== null);
  const targetMuscleGroups = splitTarget?.muscleGroups ?? [];
  const mostRecentPeptideLogDatesByTemplateId = Object.fromEntries(mostRecentPeptideLogDates);
  const mostRecentSupplementLogDatesByTemplateId = Object.fromEntries(mostRecentSupplementLogDates);

  // "Level in body" is a right-now reading, not something that makes sense for a past/future day
  // viewed via DayNav — only ever computed and shown when looking at the actual current day.
  const currentLevelByTemplateId: Record<string, number> =
    dayIso === todayIso
      ? Object.fromEntries(
          peptideTemplates
            .filter((template) => template.halfLifeHours !== null)
            .map((template) => [
              template.id,
              currentLevelPercent(
                logTimestampsForDecay.get(template.id) ?? [],
                template.doseAmount,
                template.halfLifeHours!,
                new Date(),
              ),
            ]),
        )
      : {};

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
    routineNotesAdded: routines.reduce(
      (sum, routine) =>
        sum + routine.items.filter((item) => Boolean(item.completionNotes?.trim())).length,
      0,
    ),
    workoutNotesAdded: workoutList.filter((detail) => Boolean(detail.workout.notes?.trim())).length,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Today</h1>

      <DayNav dayIso={dayIso} todayIso={todayIso} />

      <DailyScoreCard score={dailyScore} />

      {photoReminder && <ProgressPhotoReminderCard reminder={photoReminder} />}

      <TodayTabs
        nutrition={
          <NutritionTab
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
            reading={reading}
            peptideTemplates={peptideTemplates}
            peptideLogs={peptideLogs}
            mostRecentPeptideLogDates={mostRecentPeptideLogDatesByTemplateId}
            currentLevelByTemplate={currentLevelByTemplateId}
            supplementTemplates={supplementTemplates}
            supplementLogs={supplementLogs}
            mostRecentSupplementLogDates={mostRecentSupplementLogDatesByTemplateId}
          />
        }
      />
    </div>
  );
}
