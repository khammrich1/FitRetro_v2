"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { PantryItem } from "@/db/schema";
import { logPantryItemAction } from "@/app/nutrition/actions";
import { inferMealType, type MealPrefill } from "./meal-form";

function PreppedMealRow({
  item,
  dayIso,
  onAdjustAndLog,
}: {
  item: PantryItem;
  dayIso: string;
  onAdjustAndLog: (prefill: MealPrefill) => void;
}) {
  const [logged, setLogged] = useState(false);
  const [logging, startLogging] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const calories = item.caloriesPerPortion ?? 0;
  const proteinGrams = item.proteinGramsPerPortion ?? 0;
  const carbsGrams = item.carbsGramsPerPortion ?? 0;
  const fatGrams = item.fatGramsPerPortion ?? 0;

  function handleLog() {
    setError(null);
    startLogging(async () => {
      try {
        const result = await logPantryItemAction({
          pantryItemId: item.id,
          dayIso,
          mealType: inferMealType(),
        });
        if (result.error) setError(result.error);
        else setLogged(true);
      } catch {
        setError("Something went wrong logging that — try again.");
      }
    });
  }

  function handleAdjustAndLog() {
    onAdjustAndLog({
      description: item.name,
      items: [
        {
          name: item.name,
          quantity: "1 portion",
          calories,
          proteinGrams,
          carbsGrams,
          fatGrams,
        },
      ],
    });
  }

  return (
    <li className="rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium">{item.name}</p>
        {item.totalPortions !== null && (
          <span className="text-xs text-muted-foreground">
            {item.portionsRemaining} of {item.totalPortions} left
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {calories} kcal · {fatGrams.toFixed(1)}g fat · {carbsGrams.toFixed(1)}g carbs ·{" "}
        {proteinGrams.toFixed(1)}g protein
      </p>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {logged ? (
          <span className="text-accent">Logged ✓</span>
        ) : (
          <button
            type="button"
            onClick={handleLog}
            disabled={logging}
            className="text-muted-foreground hover:text-accent disabled:opacity-50"
          >
            {logging ? "Logging..." : "Log 1 portion"}
          </button>
        )}
        <button
          type="button"
          onClick={handleAdjustAndLog}
          className="text-muted-foreground hover:text-accent"
        >
          Adjust & log
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </li>
  );
}

export function PreppedMealsPanel({
  dayIso,
  items,
  onAdjustAndLog,
}: {
  dayIso: string;
  items: PantryItem[];
  onAdjustAndLog: (prefill: MealPrefill) => void;
}) {
  const prepped = items.filter(
    (item) =>
      item.caloriesPerPortion !== null &&
      (item.totalPortions === null || (item.portionsRemaining ?? 0) > 0),
  );
  if (prepped.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Prepped meals</h2>
      <p className="text-xs text-muted-foreground">
        Meal-prepped portions from your pantry, macros already known — one tap to log. Prep more at{" "}
        <Link href="/meal-prep" className="text-accent underline">
          Meal Prep
        </Link>
        .
      </p>
      <ul className="flex flex-col gap-2">
        {prepped.map((item) => (
          <PreppedMealRow
            key={item.id}
            item={item}
            dayIso={dayIso}
            onAdjustAndLog={onAdjustAndLog}
          />
        ))}
      </ul>
    </div>
  );
}
