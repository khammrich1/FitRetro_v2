"use client";

import { useTransition } from "react";
import { kgToLbs } from "@/features/workouts/units";
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from "@/db/schema";
import { deleteWorkoutAction } from "../actions";

type WorkoutDetail = {
  workout: Workout;
  exercises: (WorkoutExercise & { exercise: Exercise; sets: WorkoutSet[] })[];
};

function WorkoutCard({ detail }: { detail: WorkoutDetail }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteWorkoutAction(detail.workout.id);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{detail.workout.name}</span>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          Remove
        </button>
      </div>
      {detail.workout.notes && (
        <p className="text-xs text-muted-foreground">{detail.workout.notes}</p>
      )}
      <ul className="flex flex-col gap-1">
        {detail.exercises.map((exercise) => (
          <li key={exercise.id} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{exercise.exercise.name}</span> (
            {exercise.exercise.muscleGroup.replace("_", " ")}):{" "}
            {exercise.sets
              .map((set) => {
                const parts: string[] = [];
                if (set.reps !== null) parts.push(`${set.reps} reps`);
                if (set.weightKg !== null) parts.push(`${Math.round(kgToLbs(set.weightKg))} lb`);
                if (set.durationSeconds !== null) parts.push(`${set.durationSeconds}s`);
                if (set.rpe !== null) parts.push(`RPE ${set.rpe}`);
                return parts.join(" @ ") || "—";
              })
              .join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WorkoutList({ details }: { details: WorkoutDetail[] }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">No workouts logged yet today.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {details.map((detail) => (
        <WorkoutCard key={detail.workout.id} detail={detail} />
      ))}
    </div>
  );
}
