"use client";

import { useActionState } from "react";
import { mealTypeEnum } from "@/db/schema";
import { logMealAction } from "../actions";

export function MealForm() {
  const [state, action, pending] = useActionState(logMealAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
    >
      <h2 className="font-semibold">Log a meal</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Meal type
          <select
            name="mealType"
            defaultValue="breakfast"
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          >
            {mealTypeEnum.enumValues.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description
          <input
            name="description"
            placeholder="Grilled chicken salad"
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
          {state?.errors?.description && (
            <span className="text-red-600">{state.errors.description[0]}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Calories
          <input
            name="calories"
            type="number"
            min={0}
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Protein (g)
          <input
            name="proteinGrams"
            type="number"
            min={0}
            step="0.1"
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Carbs (g)
          <input
            name="carbsGrams"
            type="number"
            min={0}
            step="0.1"
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fat (g)
          <input
            name="fatGrams"
            type="number"
            min={0}
            step="0.1"
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-zinc-900"
          />
        </label>
      </div>

      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {pending ? "Logging..." : "Log meal"}
      </button>
    </form>
  );
}
