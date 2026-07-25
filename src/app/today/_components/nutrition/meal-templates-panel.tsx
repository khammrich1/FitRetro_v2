"use client";

import { useState, useTransition } from "react";
import type { MealTemplateWithItems } from "@/features/nutrition";
import { logMealTemplateAction } from "@/app/nutrition/actions";
import type { MealPrefill } from "./meal-form";

function TemplateRow({
  template,
  dayIso,
  onAdjustAndLog,
}: {
  template: MealTemplateWithItems;
  dayIso: string;
  onAdjustAndLog: (prefill: MealPrefill) => void;
}) {
  const [logged, setLogged] = useState(false);
  const [logging, startLogging] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totals = template.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinGrams: acc.proteinGrams + item.proteinGrams,
      carbsGrams: acc.carbsGrams + item.carbsGrams,
      fatGrams: acc.fatGrams + item.fatGrams,
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );

  function handleLogAsIs() {
    startLogging(async () => {
      const result = await logMealTemplateAction(template.id, dayIso);
      if (result.error) setError(result.error);
      else setLogged(true);
    });
  }

  function handleAdjustAndLog() {
    onAdjustAndLog({
      description: template.name,
      items: template.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        calories: item.calories,
        proteinGrams: item.proteinGrams,
        carbsGrams: item.carbsGrams,
        fatGrams: item.fatGrams,
      })),
    });
  }

  return (
    <li className="rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium">{template.name}</p>
        <span className="text-xs text-muted-foreground">{template.mealType}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {Math.round(totals.calories)} kcal · {totals.proteinGrams.toFixed(1)}g protein ·{" "}
        {totals.carbsGrams.toFixed(1)}g carbs · {totals.fatGrams.toFixed(1)}g fat
      </p>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {logged ? (
          <span className="text-accent">Logged ✓</span>
        ) : (
          <button
            type="button"
            onClick={handleLogAsIs}
            disabled={logging}
            className="text-muted-foreground hover:text-accent disabled:opacity-50"
          >
            {logging ? "Logging..." : "Log as-is"}
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

export function MealTemplatesPanel({
  dayIso,
  templates,
  onAdjustAndLog,
}: {
  dayIso: string;
  templates: MealTemplateWithItems[];
  onAdjustAndLog: (prefill: MealPrefill) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Meal templates</h2>
      <p className="text-xs text-muted-foreground">
        Meals you eat often, already estimated — one tap to log. Manage these in Settings &gt;
        Nutrition.
      </p>
      <ul className="flex flex-col gap-2">
        {templates.map((template) => (
          <TemplateRow
            key={template.id}
            template={template}
            dayIso={dayIso}
            onAdjustAndLog={onAdjustAndLog}
          />
        ))}
      </ul>
    </div>
  );
}
