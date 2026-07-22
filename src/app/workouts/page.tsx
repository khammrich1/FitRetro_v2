import { verifySession } from "@/features/auth";
import { getSplitForUser, getSplitDayForDate, getWorkoutsForDay } from "@/features/workouts";
import { SplitSchedule } from "./_components/split-schedule";
import { WorkoutLogging } from "./_components/workout-logging";
import { WorkoutList } from "./_components/workout-list";

export default async function WorkoutsPage() {
  const { userId } = await verifySession();
  const today = new Date();

  const [splitDays, todaySplitDay, workoutDetails] = await Promise.all([
    getSplitForUser(userId),
    getSplitDayForDate(userId, today),
    getWorkoutsForDay(userId, today),
  ]);

  const details = workoutDetails.filter((detail) => detail !== null);
  const targetMuscleGroups = todaySplitDay?.muscleGroups ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Workouts</h1>

      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        {todaySplitDay ? (
          <p>
            Today&apos;s target:{" "}
            <span className="font-medium text-accent">{todaySplitDay.label}</span>{" "}
            <span className="text-muted-foreground">
              ({todaySplitDay.muscleGroups.map((group) => group.replace("_", " ")).join(", ")})
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            No target set for today — set your split schedule below.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
          Today&apos;s workouts
        </h2>
        <WorkoutList details={details} />
      </div>

      <WorkoutLogging targetMuscleGroups={targetMuscleGroups} />

      <SplitSchedule splitDays={splitDays} />
    </div>
  );
}
