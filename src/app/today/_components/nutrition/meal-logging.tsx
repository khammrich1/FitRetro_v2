"use client";

import { useState, type ReactNode } from "react";
import { MealForm, type MealPrefill } from "./meal-form";
import { SuggestionsPanel } from "./suggestions-panel";
import { MealTemplatesPanel } from "./meal-templates-panel";
import { PreppedMealsPanel } from "./prepped-meals-panel";
import type { MealTemplateWithItems } from "@/features/nutrition";
import type { PantryItem } from "@/db/schema";
import type { MacroKey } from "@/lib/macro-order";

/** Shares editable prefill state between templates, suggestions, and the log form. */
export function MealLogging({
  dayIso,
  templates,
  pantryItems,
  macroOrder,
  children,
}: {
  dayIso: string;
  templates: MealTemplateWithItems[];
  pantryItems: PantryItem[];
  macroOrder: MacroKey[];
  children?: ReactNode;
}) {
  const [prefill, setPrefill] = useState<MealPrefill | null>(null);

  return (
    <>
      <MealTemplatesPanel
        dayIso={dayIso}
        templates={templates}
        onAdjustAndLog={setPrefill}
        macroOrder={macroOrder}
      />
      <MealForm
        dayIso={dayIso}
        prefill={prefill}
        onPrefillConsumed={() => setPrefill(null)}
        macroOrder={macroOrder}
      />
      {children}
      <SuggestionsPanel dayIso={dayIso} onAdjustAndLog={setPrefill} macroOrder={macroOrder} />
      <PreppedMealsPanel
        dayIso={dayIso}
        items={pantryItems}
        onAdjustAndLog={setPrefill}
        macroOrder={macroOrder}
      />
    </>
  );
}
