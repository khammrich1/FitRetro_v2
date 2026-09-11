import Link from "next/link";
import type { Exercise, MuscleGroup, Workout, WorkoutExercise, WorkoutSet } from "@/db/schema";
import type { SplitCycleTarget, WorkoutTemplateWithExercises } from "@/features/workouts";
import { SplitTargetCard } from "../workouts/split-target-card";
import { InProgressWorkoutCard } from "../workouts/in-progress-workout-card";
import { WorkoutList } from "../workouts/workout-list";
import { WorkoutLogging } from "../workouts/workout-logging";
import { isMoveTabEmpty } from "./move-tab-empty";

type WorkoutDetail = {
  workout: Workout;
  exercises: (WorkoutExercise & { exercise: Exercise; sets: WorkoutSet[] })[];
};

export function MoveTab({
  dayIso,
  splitTarget,
  inProgressWorkouts,
  completedWorkouts,
  targetMuscleGroups,
  templates,
}: {
  dayIso: string;
  splitTarget: SplitCycleTarget | null;
  inProgressWorkouts: WorkoutDetail[];
  completedWorkouts: WorkoutDetail[];
  targetMuscleGroups: MuscleGroup[];
  templates: WorkoutTemplateWithExercises[];
}) {
  const empty = isMoveTabEmpty({
    hasSplitTarget: splitTarget !== null,
    workoutCount: inProgressWorkouts.length + completedWorkouts.length,
    templateCount: templates.length,
  });

  return (
    <section className="flex flex-col gap-4">
      {empty ? (
        <p className="text-sm text-muted-foreground">
          Nothing set up yet —{" "}
          <Link href="/settings/workouts" className="text-accent underline">
            add a split or template in Settings
          </Link>
          .
        </p>
      ) : (
        <>
          <SplitTargetCard target={splitTarget} dayIso={dayIso} />
          {inProgressWorkouts.length > 0 && (
            <div className="flex flex-col gap-3">
              {inProgressWorkouts.map((detail) => (
                <InProgressWorkoutCard key={detail.workout.id} detail={detail} />
              ))}
            </div>
          )}
          {completedWorkouts.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
                Workouts logged
              </h3>
              <WorkoutList details={completedWorkouts} />
            </div>
          )}
        </>
      )}
      <WorkoutLogging
        dayIso={dayIso}
        targetMuscleGroups={targetMuscleGroups}
        templates={templates}
      />
    </section>
  );
}
