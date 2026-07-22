"use client";

import { useTransition } from "react";
import { muscleGroupEnum, type WorkoutSplitDay } from "@/db/schema";
import { upsertSplitDayAction, deleteSplitDayAction } from "../actions";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function SplitDayRow({ dayOfWeek, existing }: { dayOfWeek: number; existing?: WorkoutSplitDay }) {
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await upsertSplitDayAction(dayOfWeek, formData);
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      await deleteSplitDayAction(dayOfWeek);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{DAY_NAMES[dayOfWeek]}</span>
        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-muted-foreground hover:text-danger"
          >
            Clear
          </button>
        )}
      </div>
      <input
        name="label"
        defaultValue={existing?.label ?? ""}
        placeholder="e.g. Chest & Triceps"
        className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex flex-wrap gap-3">
        {muscleGroupEnum.enumValues.map((group) => (
          <label key={group} className="flex items-center gap-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              name="muscleGroups"
              value={group}
              defaultChecked={existing?.muscleGroups.includes(group) ?? false}
              className="h-3.5 w-3.5 accent-primary"
            />
            {group.replace("_", " ")}
          </label>
        ))}
      </div>
      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

export function SplitSchedule({ splitDays }: { splitDays: WorkoutSplitDay[] }) {
  const byDay = new Map(splitDays.map((day) => [day.dayOfWeek, day]));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Split schedule</h2>
      <p className="text-xs text-muted-foreground">
        Set which muscle groups you train each day of the week. This is global — set it once and it
        applies every week until you change it.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {DAY_NAMES.map((_, dayOfWeek) => (
          <SplitDayRow key={dayOfWeek} dayOfWeek={dayOfWeek} existing={byDay.get(dayOfWeek)} />
        ))}
      </div>
    </div>
  );
}
