"use client";

import { useState } from "react";
import { MealForm, type MealPrefill } from "./meal-form";
import { SuggestionsPanel } from "./suggestions-panel";

export function MealLogging({ dayIso }: { dayIso: string }) {
  const [prefill, setPrefill] = useState<MealPrefill | null>(null);

  return (
    <>
      <MealForm dayIso={dayIso} prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
      <SuggestionsPanel dayIso={dayIso} onAdjustAndLog={setPrefill} />
    </>
  );
}
