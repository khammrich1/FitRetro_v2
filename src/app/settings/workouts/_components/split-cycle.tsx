"use client";

import { useActionState, useState, useTransition } from "react";
import { muscleGroupEnum, type WorkoutSplitCycleDay } from "@/db/schema";
import {
  addSplitCycleDayAction,
  updateSplitCycleDayAction,
  deleteSplitCycleDayAction,
  moveSplitCycleDayAction,
} from "@/app/workouts/actions";

function SplitCycleDayRow({
  day,
  isFirst,
  isLast,
}: {
  day: WorkoutSplitCycleDay;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await updateSplitCycleDayAction(day.id, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSplitCycleDayAction(day.id);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveSplitCycleDayAction(day.id, direction);
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm"
      >
        <input
          name="label"
          defaultValue={day.label}
          className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex flex-wrap gap-3">
          {muscleGroupEnum.enumValues.map((group) => (
            <label key={group} className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="muscleGroups"
                value={group}
                defaultChecked={day.muscleGroups.includes(group)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {group.replace("_", " ")}
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            disabled={pending}
            type="submit"
            className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
      <div>
        <span className="font-medium">{day.label}</span>{" "}
        <span className="text-muted-foreground">
          ({day.muscleGroups.map((group) => group.replace("_", " ")).join(", ")})
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          onClick={() => handleMove("up")}
          disabled={pending || isFirst}
          className="hover:text-accent disabled:opacity-30"
          title="Move up"
        >
          ↑
        </button>
        <button
          onClick={() => handleMove("down")}
          disabled={pending || isLast}
          className="hover:text-accent disabled:opacity-30"
          title="Move down"
        >
          ↓
        </button>
        <button onClick={() => setEditing(true)} disabled={pending} className="hover:text-accent">
          Edit
        </button>
        <button onClick={handleDelete} disabled={pending} className="hover:text-danger">
          Remove
        </button>
      </div>
    </li>
  );
}

function AddSplitCycleDayForm() {
  const [state, action, pending] = useActionState(addSplitCycleDayAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm"
    >
      <input
        name="label"
        placeholder="e.g. Chest & Triceps"
        className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {state?.errors?.label && <span className="text-xs text-danger">{state.errors.label[0]}</span>}
      <div className="flex flex-wrap gap-3">
        {muscleGroupEnum.enumValues.map((group) => (
          <label key={group} className="flex items-center gap-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              name="muscleGroups"
              value={group}
              className="h-3.5 w-3.5 accent-primary"
            />
            {group.replace("_", " ")}
          </label>
        ))}
      </div>
      {state?.errors?.muscleGroups && (
        <span className="text-xs text-danger">{state.errors.muscleGroups[0]}</span>
      )}
      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Adding..." : "+ Add step"}
      </button>
    </form>
  );
}

export function SplitCycle({ cycleDays }: { cycleDays: WorkoutSplitCycleDay[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
        Workout rotation
      </h2>
      <p className="text-xs text-muted-foreground">
        Build your rotation in order (e.g. Chest &amp; Tris → Back &amp; Bi → Legs). It repeats
        indefinitely and only advances when you mark a step done on the Today page, so rest days
        don&apos;t throw it off.
      </p>
      {cycleDays.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rotation steps yet — add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cycleDays.map((day, index) => (
            <SplitCycleDayRow
              key={day.id}
              day={day}
              isFirst={index === 0}
              isLast={index === cycleDays.length - 1}
            />
          ))}
        </ul>
      )}
      <AddSplitCycleDayForm />
    </div>
  );
}
