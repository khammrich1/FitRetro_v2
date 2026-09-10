"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { PantryItem } from "@/db/schema";
import { logPantryItemAction } from "@/app/nutrition/actions";
import { inferMealType, type MealPrefill } from "./meal-form";
import { type MacroKey } from "@/lib/macro-order";

function PreppedMealRow({
  item,
  dayIso,
  onAdjustAndLog,
  macroOrder,
}: {
  item: PantryItem;
  dayIso: string;
  onAdjustAndLog: (prefill: MealPrefill) => void;
  macroOrder: MacroKey[];
}) {
  const [logged, setLogged] = useState(false);
  const [logging, startLogging] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qtyInput, setQtyInput] = useState("1");

  const calories = item.caloriesPerPortion ?? 0;
  const proteinGrams = item.proteinGramsPerPortion ?? 0;
  const carbsGrams = item.carbsGramsPerPortion ?? 0;
  const fatGrams = item.fatGramsPerPortion ?? 0;
  const gramsByKey: Record<MacroKey, number> = {
    fat: fatGrams,
    carbs: carbsGrams,
    protein: proteinGrams,
  };
  const remaining = item.portionsRemaining ?? 1;
  const quantity = Math.min(remaining, Math.max(1, Math.round(Number(qtyInput) || 1)));

  function handleLog() {
    setError(null);
    startLogging(async () => {
      try {
        const result = await logPantryItemAction({
          pantryItemId: item.id,
          dayIso,
          mealType: inferMealType(),
          quantity,
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
          quantity: quantity > 1 ? `${quantity} units` : "1 unit",
          calories: calories * quantity,
          proteinGrams: proteinGrams * quantity,
          carbsGrams: carbsGrams * quantity,
          fatGrams: fatGrams * quantity,
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
        {calories} kcal ·{" "}
        {macroOrder.map((key) => `${gramsByKey[key].toFixed(1)}g ${key}`).join(" · ")}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {logged ? (
          <span className="text-accent">Logged ✓</span>
        ) : (
          <>
            <input
              type="number"
              min={1}
              max={remaining}
              value={qtyInput}
              onChange={(event) => setQtyInput(event.target.value)}
              disabled={logging}
              aria-label={`Quantity of ${item.name} to log`}
              className="w-14 rounded-md border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={handleLog}
              disabled={logging}
              className="text-muted-foreground hover:text-accent disabled:opacity-50"
            >
              {logging ? "Logging..." : `Log ${quantity}`}
            </button>
          </>
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
  macroOrder,
}: {
  dayIso: string;
  items: PantryItem[];
  onAdjustAndLog: (prefill: MealPrefill) => void;
  macroOrder: MacroKey[];
}) {
  const prepped = items.filter(
    (item) =>
      item.caloriesPerPortion !== null &&
      (item.totalPortions === null || (item.portionsRemaining ?? 0) > 0),
  );
  if (prepped.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Quick log</h2>
      <p className="text-xs text-muted-foreground">
        Pantry items with known macros and a count — meal-prepped portions or individually tracked
        units like a case of protein shakes — one tap to log. Prep a batch at{" "}
        <Link href="/meal-prep" className="text-accent underline">
          Meal Prep
        </Link>
        , or add a countable item directly from{" "}
        <Link href="/pantry" className="text-accent underline">
          Pantry
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
            macroOrder={macroOrder}
          />
        ))}
      </ul>
    </div>
  );
}
