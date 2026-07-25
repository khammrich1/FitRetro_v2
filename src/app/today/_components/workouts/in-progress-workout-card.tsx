"use client";

import { useState, useTransition } from "react";
import { muscleGroupEnum, type MuscleGroup } from "@/db/schema";
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from "@/db/schema";
import { kgToLbs } from "@/features/workouts/units";
import {
  updateWorkoutSetAction,
  addWorkoutSetAction,
  removeWorkoutSetAction,
  addWorkoutExerciseAction,
  removeWorkoutExerciseAction,
  updateWorkoutNameAction,
  finishWorkoutAction,
  deleteWorkoutAction,
} from "@/app/workouts/actions";

type WorkoutDetail = {
  workout: Workout;
  exercises: (WorkoutExercise & { exercise: Exercise; sets: WorkoutSet[] })[];
};

function SetRow({ set, canRemove }: { set: WorkoutSet; canRemove: boolean }) {
  const [pending, startTransition] = useTransition();
  const [reps, setReps] = useState(set.reps !== null ? String(set.reps) : "");
  const [weightLbs, setWeightLbs] = useState(
    set.weightKg !== null ? String(Math.round(kgToLbs(set.weightKg) * 10) / 10) : "",
  );
  const [durationSeconds, setDurationSeconds] = useState(
    set.durationSeconds !== null ? String(set.durationSeconds) : "",
  );
  const [rpe, setRpe] = useState(set.rpe !== null ? String(set.rpe) : "");

  function commit() {
    startTransition(async () => {
      await updateWorkoutSetAction(set.id, {
        reps: reps.trim() === "" ? null : Number(reps),
        weightLbs: weightLbs.trim() === "" ? null : Number(weightLbs),
        durationSeconds: durationSeconds.trim() === "" ? null : Number(durationSeconds),
        rpe: rpe.trim() === "" ? null : Number(rpe),
      });
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeWorkoutSetAction(set.id);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="grid flex-1 grid-cols-4 gap-2">
        <input
          type="number"
          min={0}
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          onBlur={commit}
          disabled={pending}
          className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="number"
          min={0}
          step="any"
          value={weightLbs}
          onChange={(event) => setWeightLbs(event.target.value)}
          onBlur={commit}
          disabled={pending}
          className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="number"
          min={0}
          value={durationSeconds}
          onChange={(event) => setDurationSeconds(event.target.value)}
          onBlur={commit}
          disabled={pending}
          className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="number"
          min={0}
          step="any"
          value={rpe}
          onChange={(event) => setRpe(event.target.value)}
          onBlur={commit}
          disabled={pending}
          className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
}: {
  exercise: WorkoutExercise & { exercise: Exercise; sets: WorkoutSet[] };
}) {
  const [pending, startTransition] = useTransition();

  function handleAddSet() {
    startTransition(async () => {
      await addWorkoutSetAction(exercise.id);
    });
  }

  function handleRemoveExercise() {
    startTransition(async () => {
      await removeWorkoutExerciseAction(exercise.id);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {exercise.exercise.name}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({exercise.exercise.muscleGroup.replace("_", " ")})
          </span>
        </span>
        <button
          type="button"
          onClick={handleRemoveExercise}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 px-2 text-xs text-muted-foreground">
        <span>Reps</span>
        <span>Weight (lb)</span>
        <span>Duration (s)</span>
        <span>RPE</span>
      </div>
      {exercise.sets.map((set) => (
        <SetRow key={set.id} set={set} canRemove={exercise.sets.length > 1} />
      ))}
      <button
        type="button"
        onClick={handleAddSet}
        disabled={pending}
        className="self-start text-xs text-accent hover:underline disabled:opacity-50"
      >
        + Add set
      </button>
    </div>
  );
}

function AddExerciseForm({ workoutId }: { workoutId: string }) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(muscleGroupEnum.enumValues[0]);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addWorkoutExerciseAction(workoutId, name, muscleGroup);
      setName("");
    });
  }

  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Add another exercise"
        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <select
        value={muscleGroup}
        onChange={(event) => setMuscleGroup(event.target.value as MuscleGroup)}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {muscleGroupEnum.enumValues.map((group) => (
          <option key={group} value={group}>
            {group.replace("_", " ")}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={pending || !name.trim()}
        className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  );
}

export function InProgressWorkoutCard({ detail }: { detail: WorkoutDetail }) {
  const [name, setName] = useState(detail.workout.name);
  const [savingName, startSavingName] = useTransition();
  const [finishing, startFinishing] = useTransition();
  const [discarding, startDiscarding] = useTransition();

  function commitName() {
    if (!name.trim()) {
      setName(detail.workout.name);
      return;
    }
    if (name === detail.workout.name) return;
    startSavingName(async () => {
      await updateWorkoutNameAction(detail.workout.id, name);
    });
  }

  function handleFinish() {
    startFinishing(async () => {
      await finishWorkoutAction(detail.workout.id);
    });
  }

  function handleDiscard() {
    startDiscarding(async () => {
      await deleteWorkoutAction(detail.workout.id);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          disabled={savingName}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="whitespace-nowrap text-xs uppercase tracking-wide text-accent">
          In progress
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {detail.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>

      <AddExerciseForm workoutId={detail.workout.id} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleFinish}
          disabled={finishing}
          className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {finishing ? "Finishing..." : "Finish workout"}
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={discarding}
          className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-danger hover:text-danger disabled:opacity-50"
        >
          Discard
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Saved automatically as you go — safe to close or refresh mid-workout.
      </p>
    </div>
  );
}
