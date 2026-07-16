"use client";

import { useActionState } from "react";
import { setGoalsAction } from "../actions";
import type { NutritionGoal } from "@/db/schema";

export function GoalsForm({ goal }: { goal: NutritionGoal | null }) {
  const [state, action, pending] = useActionState(setGoalsAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
        Daily macro targets
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Calories
          <input
            name="dailyCalories"
            type="number"
            min={0}
            defaultValue={goal?.dailyCalories}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Protein (g)
          <input
            name="dailyProteinGrams"
            type="number"
            min={0}
            step="any"
            defaultValue={goal?.dailyProteinGrams}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Carbs (g)
          <input
            name="dailyCarbsGrams"
            type="number"
            min={0}
            step="any"
            defaultValue={goal?.dailyCarbsGrams}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fat (g)
          <input
            name="dailyFatGrams"
            type="number"
            min={0}
            step="any"
            defaultValue={goal?.dailyFatGrams}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      {state?.errors && (
        <p className="text-sm text-danger">Check the values above and try again.</p>
      )}

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save targets"}
      </button>
    </form>
  );
}
