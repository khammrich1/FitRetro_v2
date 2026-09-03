"use client";

import { useState, type ReactNode } from "react";
import { MealForm, type MealPrefill } from "./meal-form";
import { SuggestionsPanel } from "./suggestions-panel";
import { MealTemplatesPanel } from "./meal-templates-panel";
import { PreppedMealsPanel } from "./prepped-meals-panel";
import type { MealTemplateWithItems } from "@/features/nutrition";
import type { PantryItem } from "@/db/schema";

/** Wraps everything in the Nutrition section that shares "prefill" state — a suggestion or
 * template's items staged into the log form for editing before submit. Suggestions render near
 * the macro tracker at the top; templates and the custom form render further down, but all three
 * need to feed the same form instance, so this one client component spans both positions with the
 * logged-meals list passed through as `children` in between. */
export function MealLogging({
  dayIso,
  templates,
  pantryItems,
  children,
}: {
  dayIso: string;
  templates: MealTemplateWithItems[];
  pantryItems: PantryItem[];
  children?: ReactNode;
}) {
  const [prefill, setPrefill] = useState<MealPrefill | null>(null);

  return (
    <>
      <SuggestionsPanel dayIso={dayIso} onAdjustAndLog={setPrefill} />
      {children}
      <MealTemplatesPanel dayIso={dayIso} templates={templates} onAdjustAndLog={setPrefill} />
      <PreppedMealsPanel dayIso={dayIso} items={pantryItems} onAdjustAndLog={setPrefill} />
      <MealForm dayIso={dayIso} prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
    </>
  );
}
