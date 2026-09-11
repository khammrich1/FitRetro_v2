"use client";

import { useActionState } from "react";
import { suggestGoalsFromBodyStatsAction } from "@/app/nutrition/actions";

export function SuggestedGoalCard() {
  const [state, action, pending] = useActionState(suggestGoalsFromBodyStatsAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
        Get a suggested goal
      </h2>
      <p className="text-xs text-muted-foreground">
        Fill this in and we&apos;ll calculate a starting daily calorie/protein/carb/fat target and
        apply it below — this overwrites your current targets, and you can always fine-tune them by
        hand afterward.
      </p>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Sex
          <select
            name="sex"
            defaultValue=""
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="" disabled>
              —
            </option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Age
          <input
            name="age"
            type="number"
            min={0}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      {(state?.errors?.sex || state?.errors?.age) && (
        <p className="text-sm text-danger">{state?.errors?.sex?.[0] ?? state?.errors?.age?.[0]}</p>
      )}

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Height (ft)
          <input
            name="heightFeet"
            type="number"
            min={0}
            placeholder="5"
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Height (in)
          <input
            name="heightInches"
            type="number"
            min={0}
            max={11.9}
            step="any"
            placeholder="9"
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Weight (lb)
          <input
            name="weightLbs"
            type="number"
            min={0}
            step="any"
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      {(state?.errors?.heightFeet || state?.errors?.heightInches || state?.errors?.weightLbs) && (
        <p className="text-sm text-danger">
          {state?.errors?.heightFeet?.[0] ??
            state?.errors?.heightInches?.[0] ??
            state?.errors?.weightLbs?.[0]}
        </p>
      )}

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Calculating..." : "Calculate & apply"}
      </button>
    </form>
  );
}
