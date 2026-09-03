import { verifySession } from "@/features/auth";
import { toIsoDate, parseDayParam } from "@/lib/date";
import { computeDailyScore } from "@/lib/daily-score";
import { DayNav } from "@/components/ui/day-nav";
import { DailyScoreCard } from "./_components/daily-score-card";
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
import { MacroProgress } from "./_components/nutrition/macro-progress";
import { MealList } from "./_components/nutrition/meal-list";
import { MealLogging } from "./_components/nutrition/meal-logging";
import { WaterTracker } from "./_components/nutrition/water-tracker";
import { RoutineChecklistCard } from "./_components/routine/routine-checklist-card";
import { DailyMissionCard } from "./_components/daily-mission-card";
import { DailyNoteCard } from "./_components/daily-note-card";
import { WorkoutList } from "./_components/workouts/workout-list";
import { WorkoutLogging } from "./_components/workouts/workout-logging";
import { SplitTargetCard } from "./_components/workouts/split-target-card";
import { InProgressWorkoutCard } from "./_components/workouts/in-progress-workout-card";
import { PeptideSection } from "./_components/peptides/peptide-section";
import { SupplementSection } from "./_components/supplements/supplement-section";

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
  ]);

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Today</h1>

      <DayNav dayIso={dayIso} todayIso={todayIso} />

      <DailyScoreCard score={dailyScore} />

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Nutrition</h2>
        <MacroProgress consumed={consumed} goal={goal} />
        <WaterTracker
          key={dayIso}
          dayIso={dayIso}
          initialOunces={waterOunces}
          goalOunces={goal?.dailyWaterOunces ?? 64}
        />
        <MealLogging dayIso={dayIso} templates={mealTemplates} pantryItems={pantryItems}>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
              Meals
            </h3>
            <MealList entries={entries} />
          </div>
        </MealLogging>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Routine</h2>
        {routines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No routines yet — create one in Settings &gt; Routine templates.
          </p>
        ) : (
          routines.map((routine) => (
            <RoutineChecklistCard key={routine.id} routine={routine} dayIso={dayIso} />
          ))
        )}
      </section>

      <DailyMissionCard mission={mission} dayIso={dayIso} />

      <DailyNoteCard dayIso={dayIso} note={dailyNote} />

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Workouts</h2>
        <SplitTargetCard target={splitTarget} dayIso={dayIso} />
        {inProgressWorkouts.length > 0 && (
          <div className="flex flex-col gap-3">
            {inProgressWorkouts.map((detail) => (
              <InProgressWorkoutCard key={detail.workout.id} detail={detail} />
            ))}
          </div>
        )}
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
            Workouts logged
          </h3>
          <WorkoutList details={completedWorkouts} />
        </div>
        <WorkoutLogging
          dayIso={dayIso}
          targetMuscleGroups={targetMuscleGroups}
          templates={templates}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Peptides</h2>
        <PeptideSection
          dayIso={dayIso}
          templates={peptideTemplates}
          logs={peptideLogs}
          mostRecentLogDates={mostRecentPeptideLogDatesByTemplateId}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Supplements</h2>
        <SupplementSection
          dayIso={dayIso}
          templates={supplementTemplates}
          logs={supplementLogs}
          mostRecentLogDates={mostRecentSupplementLogDatesByTemplateId}
        />
      </section>
    </div>
  );
}
