import { verifySession } from "@/features/auth";
import { toIsoDate, parseDayParam } from "@/lib/date";
import { DayNav } from "@/components/ui/day-nav";
import { getGoals, getEntriesForDay, summarizeMacros } from "@/features/nutrition";
import { getRoutinesForUser } from "@/features/routines";
import { getSplitDayForDate, getWorkoutsForDay, getTemplatesForUser } from "@/features/workouts";
import { getPeptideTemplatesForUser, getPeptideLogsForDay } from "@/features/peptides";
import { MacroProgress } from "./_components/nutrition/macro-progress";
import { MealList } from "./_components/nutrition/meal-list";
import { MealLogging } from "./_components/nutrition/meal-logging";
import { RoutineChecklistCard } from "./_components/routine/routine-checklist-card";
import { WorkoutList } from "./_components/workouts/workout-list";
import { WorkoutLogging } from "./_components/workouts/workout-logging";
import { PeptideSection } from "./_components/peptides/peptide-section";

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
    routines,
    todaySplitDay,
    workoutDetails,
    templates,
    peptideTemplates,
    peptideLogs,
  ] = await Promise.all([
    getGoals(userId),
    getEntriesForDay(userId, day),
    getRoutinesForUser(userId, day),
    getSplitDayForDate(userId, day),
    getWorkoutsForDay(userId, day),
    getTemplatesForUser(userId),
    getPeptideTemplatesForUser(userId),
    getPeptideLogsForDay(userId, day),
  ]);

  const consumed = summarizeMacros(entries);
  const workoutList = workoutDetails.filter((detail) => detail !== null);
  const targetMuscleGroups = todaySplitDay?.muscleGroups ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Today</h1>

      <DayNav dayIso={dayIso} todayIso={todayIso} />

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Nutrition</h2>
        <MacroProgress consumed={consumed} goal={goal} />
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">Meals</h3>
          <MealList entries={entries} />
        </div>
        <MealLogging dayIso={dayIso} />
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

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Workouts</h2>
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          {todaySplitDay ? (
            <p>
              Target: <span className="font-medium text-accent">{todaySplitDay.label}</span>{" "}
              <span className="text-muted-foreground">
                ({todaySplitDay.muscleGroups.map((group) => group.replace("_", " ")).join(", ")})
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              No target set for this day — set your split schedule in Settings.
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
            Workouts logged
          </h3>
          <WorkoutList details={workoutList} />
        </div>
        <WorkoutLogging
          dayIso={dayIso}
          targetMuscleGroups={targetMuscleGroups}
          templates={templates}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="retro-heading text-lg font-semibold text-primary">Peptides</h2>
        <PeptideSection dayIso={dayIso} templates={peptideTemplates} logs={peptideLogs} />
      </section>
    </div>
  );
}
